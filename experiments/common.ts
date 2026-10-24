// Общее для скриптов эксперимента 1 (run-generation.ts, export-logs.ts): настройки, вход тестового аккаунта
// с автообновлением токена, файлы runs.jsonl и CSV. Node.js 24+: TypeScript запускается без сборки.
//
// Настройки — experiments/.env.local (в .gitignore):
//   EXP_EMAIL, EXP_PASSWORD  — тестовый аккаунт эксперимента (запуски отличаются по его user_id)
//   EXP_SUPABASE_URL, EXP_SUPABASE_ANON_KEY — необязательно: по умолчанию VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
//                              из .env.local / .env в корне (anon-ключ публичный, он и так в бандле приложения).
// Переменные окружения важнее файлов — так скрипты направляются на локальную заглушку (stub-supabase.ts).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

export const ROOT = join(import.meta.dirname, '..')
export const EXPERIMENTS = join(ROOT, 'experiments')
export const DEFAULT_OUT = join(EXPERIMENTS, 'results', 'exp1')
export const DEFAULT_PROMPTS = join(EXPERIMENTS, 'prompts-exp1.json')

/** Условия эксперимента 1 (протокол — PLAN.md, этап 7). */
export const EXP_MODELS = ['GigaChat-2-Pro', 'GigaChat-2-Max', 'GigaChat-3-Lightning', 'GigaChat-3-Pro', 'GigaChat-3-Ultra']
export const EXP_MODES = ['markdown', 'json']
/** Два повтора: третий отменён после анализа повторов 1–2 (PLAN.md, протокол эксперимента 1) */
export const EXP_REPS = 2
/** Версия обработки, замороженная после этапа 5: другая версия в журнале — прогон смешан. */
export const FROZEN_PIPELINE = 'edc3f00780a2'

export interface PromptItem {
  id: string
  business?: string
  description: string
  tags: string[]
  check: string
}

/**
 * Строка runs.jsonl — один завершённый запуск (ответ функции 200). Технический сбой тоже записывается (с failure),
 * а запуск повторяется: в выборку идёт последний запуск без сбоя, сбои считаются отдельно.
 */
export interface RunRecord {
  key: string
  model: string
  rep: number
  id: string
  mode: string
  business: string | null
  description: string
  userId: string
  runId: string
  outcome: string
  attempts: number
  /** Время запуска с точки зрения пользователя: от запроса до ответа функции */
  seconds: number
  startedAt: string
  /** Неудачные обращения перед успешным (занято, 5xx, сеть): их запуски в журнале не попадают в выборку */
  retries: { http: number | null; error: string; at: string }[]
  /** Технический сбой (см. technicalFailure): причина из журнала. Нет поля — не сбой или ещё не проверено */
  failure?: string
}

/** Исходы, за которыми может стоять технический сбой; остальные — всегда результат модели и обработки. */
export const FAILURE_OUTCOMES = ['model-error', 'busy']

/**
 * Технический сбой — запуск оборвался не по вине модели, ответа модели нет (протокол эксперимента 1):
 * HTTP 5xx от GigaChat, обрыв сети; а также «занято» (429) и отказ авторизации (401, OAuth) — запрос до модели не дошёл.
 * Не сбой, а результат: deadline, no-progress, max-attempts, blacklist, length, битый JSON, таймаут ответа модели,
 * другие ответы 4xx. Возвращает причину (текст ошибки из журнала) или null.
 */
export function technicalFailure(outcome: string, rows: { stage: string; error: string | null }[]): string | null {
  if (!FAILURE_OUTCOMES.includes(outcome)) return null
  for (const row of rows) {
    const error = row.stage === 'model' ? row.error?.trim() : undefined
    if (!error) continue
    // «Chat 502: <html>…» → «Chat 502»
    const http = error.match(/^(Chat|OAuth) (\d{3})\b/)
    if (http && (http[2].startsWith('5') || http[2] === '429' || http[2] === '401')) return `${http[1]} ${http[2]}`
    // «Chat: <ошибка соединения>» — кроме таймаута ответа и неразобранного ответа
    if (/^(Chat|OAuth): /.test(error) && !/время ожидания|не разобран/.test(error)) return error.slice(0, 120)
  }
  return null
}

/** Строки generation_logs по run_id (только свои — RLS). select — какие колонки. */
export async function fetchLogs<T>(session: Session, runIds: string[], select = '*'): Promise<T[]> {
  const url = `${session.config.url}/rest/v1/generation_logs?select=${select}&run_id=in.(${runIds.join(',')})&order=run_id,attempt,stage`
  for (let retry = 0; ; retry++) {
    const res = await fetch(url, {
      headers: { apikey: session.config.anonKey, Authorization: `Bearer ${await session.token()}` },
      signal: AbortSignal.timeout(60_000),
    }).catch((error: Error) => error)
    if (res instanceof Response && res.ok) return (await res.json()) as T[]
    if (res instanceof Response && res.status === 401 && retry === 0) {
      await session.refresh()
      continue
    }
    if (retry >= 2) fail(`журнал не читается: ${res instanceof Response ? `HTTP ${res.status} ${await res.text()}` : res.message}`)
    await sleep(5000)
  }
}

export const runKey = (model: string, rep: number, id: string, mode: string) => `${model}|${rep}|${id}|${mode}`

export function fail(message: string): never {
  console.error(`Ошибка: ${message}`)
  process.exit(1)
}

export function readJson<T>(path: string): T {
  if (!existsSync(path)) fail(`нет файла ${path}`)
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function readPrompts(path: string): PromptItem[] {
  return readJson<PromptItem[]>(path)
}

/** runs.jsonl: строка на запуск. Оборванная последняя строка (прервали во время записи) пропускается. */
export function readRuns(path: string): RunRecord[] {
  if (!existsSync(path)) return []
  const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line.trim())
  return lines.flatMap((line, i) => {
    try {
      return [JSON.parse(line) as RunRecord]
    } catch {
      console.warn(`Внимание: строка ${i + 1} файла ${path} не разобралась — пропущена`)
      return []
    }
  })
}

function envFile(path: string): Record<string, string | undefined> {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
}

export interface Config {
  url: string
  anonKey: string
  email: string
  password: string
}

export function loadConfig(): Config {
  const local = envFile(join(EXPERIMENTS, '.env.local'))
  const app = { ...envFile(join(ROOT, '.env')), ...envFile(join(ROOT, '.env.local')) }
  const get = (name: string) => process.env[name] || local[name]
  const config = {
    url: (get('EXP_SUPABASE_URL') || app.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    anonKey: get('EXP_SUPABASE_ANON_KEY') || app.VITE_SUPABASE_ANON_KEY || '',
    email: get('EXP_EMAIL') || '',
    password: get('EXP_PASSWORD') || '',
  }
  if (!config.email || !config.password) {
    fail('нет EXP_EMAIL или EXP_PASSWORD. Создайте experiments/.env.local с данными тестового аккаунта (см. PLAN.md, этап 7)')
  }
  if (!config.url || !config.anonKey) fail('нет адреса Supabase или anon-ключа (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env)')
  return config
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string }
}

/** Сессия тестового аккаунта: вход по паролю, токен обновляется сам за 2 минуты до истечения. */
export class Session {
  readonly config: Config
  userId = ''
  #access = ''
  #refresh = ''
  #expiresAt = 0

  constructor(config: Config) {
    this.config = config
  }

  async signIn(): Promise<void> {
    const res = await this.#auth('password', { email: this.config.email, password: this.config.password })
    if (!res) fail('не удалось войти: проверьте EXP_EMAIL и EXP_PASSWORD в experiments/.env.local')
    this.#store(res)
  }

  /** Действующий access token; обновляется заранее, а если обновление не прошло — повторный вход. */
  async token(): Promise<string> {
    if (Date.now() > this.#expiresAt - 120_000) await this.refresh()
    return this.#access
  }

  async refresh(): Promise<void> {
    const res = this.#refresh ? await this.#auth('refresh_token', { refresh_token: this.#refresh }) : null
    if (res) this.#store(res)
    else await this.signIn()
  }

  #store(res: TokenResponse): void {
    this.#access = res.access_token
    this.#refresh = res.refresh_token
    this.#expiresAt = Date.now() + res.expires_in * 1000
    if (this.userId && this.userId !== res.user.id) fail('после обновления токена сменился пользователь')
    this.userId = res.user.id
  }

  async #auth(grant: string, body: Record<string, string>): Promise<TokenResponse | null> {
    let res: Response
    try {
      res = await fetch(`${this.config.url}/auth/v1/token?grant_type=${grant}`, {
        method: 'POST',
        headers: { apikey: this.config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (error) {
      fail(`Supabase недоступен (${(error as Error).message}). Проверьте интернет и запустите снова`)
    }
    return res.ok ? ((await res.json()) as TokenResponse) : null
  }
}

/** CSV для Excel/Numbers и pandas: запятая, кавычки по необходимости, UTF-8 с BOM (иначе Excel ломает кириллицу). */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const cell = (value: unknown) => {
    const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join('|') : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return '﻿' + [cols.join(','), ...rows.map((row) => cols.map((c) => cell(row[c])).join(','))].join('\n') + '\n'
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
