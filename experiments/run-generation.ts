// Прогон эксперимента 1: описания × модели × режимы × повторы через задеплоенную функцию generate-site.
// Замена run-step8.sh: вход по паролю тестового аккаунта (experiments/.env.local, см. common.ts),
// токен обновляется сам, прогон можно прерывать и продолжать.
//
//   node experiments/run-generation.ts --dry-run                 # план прогона без сети
//   node experiments/run-generation.ts                           # всё: 5 моделей × 3 повтора × 48 × 2 режима
//   node experiments/run-generation.ts --models GigaChat-2-Pro --reps 1 --only b01-clean,t03-messenger-only
//
// Параметры: --models, --modes, --only (через запятую), --reps N, --prompts файл, --out папка (по умолчанию
// experiments/results/exp1 — в .gitignore), --dry-run.
// Порядок строго последовательный (у физлица в GigaChat один поток): модель → повтор → описание → режим.
// Каждый завершённый запуск сразу дописывается в <out>/runs.jsonl; при повторном старте готовые пропускаются.
// Занято, 5xx, сеть — пауза и повтор; limit, 401, 400 — остановка (продолжить можно тем же запуском).
// Ctrl+C — остановка после текущего запуска, второй Ctrl+C — сразу.
// EXP_PAUSE_SCALE — множитель пауз (для проверки на заглушке: 0.001).

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import {
  DEFAULT_OUT,
  DEFAULT_PROMPTS,
  EXP_MODELS,
  EXP_MODES,
  EXP_REPS,
  fail,
  loadConfig,
  type PromptItem,
  readPrompts,
  readRuns,
  ROOT,
  type RunRecord,
  runKey,
  Session,
  sleep,
} from './common.ts'

/** Паузы перед повтором, с: «занято» — ждём, пока GigaChat освободится; 5xx и сеть — реже и дольше. */
const BUSY_PAUSES = [20, 40, 60, 120, 120, 300, 300, 600]
const ERROR_PAUSES = [15, 30, 60, 120, 300]
/** Функция отвечает за 150 с (PLAN.md, этап 5) — ждём чуть дольше. */
const REQUEST_TIMEOUT_MS = 180_000

const { values: args } = parseArgs({
  options: {
    models: { type: 'string' },
    modes: { type: 'string' },
    reps: { type: 'string' },
    only: { type: 'string' },
    prompts: { type: 'string' },
    out: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
})

const list = (value: string | undefined, all: string[]) => (value ? value.split(',').map((s) => s.trim()).filter(Boolean) : all)
const models = list(args.models, EXP_MODELS)
const modes = list(args.modes, EXP_MODES)
const reps = args.reps ? Number(args.reps) : EXP_REPS
if (!Number.isInteger(reps) || reps < 1) fail('--reps — целое число от 1')
for (const mode of modes) if (!EXP_MODES.includes(mode)) fail(`неизвестный режим ${mode}`)

const promptsPath = args.prompts ?? DEFAULT_PROMPTS
const allPrompts = readPrompts(promptsPath)
const onlyIds = list(args.only, [])
for (const id of onlyIds) if (!allPrompts.some((p) => p.id === id)) fail(`нет описания ${id} в ${promptsPath}`)
const prompts = onlyIds.length ? allPrompts.filter((p) => onlyIds.includes(p.id)) : allPrompts

const outDir = args.out ?? DEFAULT_OUT
const runsPath = join(outDir, 'runs.jsonl')
const pauseScale = Number(process.env.EXP_PAUSE_SCALE ?? 1)

interface Task {
  model: string
  rep: number
  prompt: PromptItem
  mode: string
  key: string
}

// Порядок: модель → повтор → описание → режим (весь первый повтор модели раньше второго)
const tasks: Task[] = models.flatMap((model) =>
  Array.from({ length: reps }, (_, i) => i + 1).flatMap((rep) =>
    prompts.flatMap((prompt) => modes.map((mode) => ({ model, rep, prompt, mode, key: runKey(model, rep, prompt.id, mode) }))),
  ),
)

const done = new Map(readRuns(runsPath).map((r) => [r.key, r]))
// Описание поменяли после начала прогона — старые запуски уже не о том же тексте
for (const task of tasks) {
  const old = done.get(task.key)
  if (old && old.description !== task.prompt.description.trim()) {
    fail(`описание ${task.prompt.id} изменилось после запуска ${task.key}. Отложенную выборку во время прогона не меняют`)
  }
}
const todo = tasks.filter((t) => !done.has(t.key))

console.log(`Описаний: ${prompts.length}, модели: ${models.join(', ')}, режимы: ${modes.join(', ')}, повторов: ${reps}`)
console.log(`Запусков: ${tasks.length}, готово: ${tasks.length - todo.length}, осталось: ${todo.length}`)
const shown = relative(ROOT, runsPath)
console.log(`Журнал: ${shown.startsWith('..') ? runsPath : shown}`)

if (args['dry-run']) {
  for (const t of todo.slice(0, 12)) console.log(`  ${t.key}`)
  if (todo.length > 12) console.log(`  … и ещё ${todo.length - 12}`)
  process.exit(0)
}
if (!todo.length) process.exit(0)

const session = new Session(loadConfig())
await session.signIn()
console.log(`Тестовый аккаунт: ${session.userId}`)
const otherUser = [...done.values()].find((r) => r.userId !== session.userId)
if (otherUser) console.warn(`Внимание: в runs.jsonl есть запуски другого аккаунта (${otherUser.userId}) — выгрузка их не увидит`)

mkdirSync(outDir, { recursive: true })
// Прошлый запуск прервали во время записи — новая строка не должна приклеиться к оборванной
if (existsSync(runsPath) && !readFileSync(runsPath, 'utf8').endsWith('\n')) appendFileSync(runsPath, '\n')
const functionUrl = `${session.config.url}/functions/v1/generate-site`

let stopRequested = false
process.on('SIGINT', () => {
  if (stopRequested) process.exit(130)
  stopRequested = true
  console.log('\nОстановка после текущего запуска (ещё раз Ctrl+C — сразу; готовые запуски сохранены)')
})

interface Reply {
  http: number | null
  body: Record<string, unknown>
  error?: string
}

async function callFunction(task: Task, token: string): Promise<Reply> {
  const request: Record<string, string> = { description: task.prompt.description, mode: task.mode, model: task.model }
  if (task.prompt.business) request.business = task.prompt.business
  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return { http: res.status, body }
  } catch (error) {
    return { http: null, body: {}, error: (error as Error).message }
  }
}

/** Один запуск с повторами. Возвращает запись или null — тогда прогон останавливается (причина уже напечатана). */
async function run(task: Task): Promise<RunRecord | null> {
  const retries: RunRecord['retries'] = []
  let busy = 0
  let errors = 0
  let refreshed = false
  for (;;) {
    const startedAt = new Date()
    const reply = await callFunction(task, await session.token())
    const seconds = (Date.now() - startedAt.getTime()) / 1000
    const message = String(reply.body.error ?? reply.error ?? '')

    if (reply.http === 200 && typeof reply.body.runId === 'string') {
      return {
        key: task.key,
        model: task.model,
        rep: task.rep,
        id: task.prompt.id,
        mode: task.mode,
        business: task.prompt.business ?? null,
        description: task.prompt.description.trim(),
        userId: session.userId,
        runId: reply.body.runId,
        outcome: String(reply.body.outcome),
        attempts: Number(reply.body.attempts),
        seconds: Math.round(seconds * 10) / 10,
        startedAt: startedAt.toISOString(),
        retries,
      }
    }

    // Токен отозван раньше срока — один раз входим заново
    if (reply.http === 401 && !refreshed) {
      refreshed = true
      await session.refresh()
      continue
    }
    if (reply.http === 401) return stop(`сервер не принимает вход (401): ${message}`)
    if (reply.http === 429 || reply.body.code === 'limit') {
      return stop(`исчерпан суточный лимит: добавьте ${session.userId} в секрет GENERATION_UNLIMITED_USERS`)
    }
    if (reply.http === 400) return stop(`функция отклонила запрос (400): ${message}. Если «Неизвестная модель» — задеплойте generate-site`)

    const isBusy = reply.http === 503 && reply.body.code === 'busy'
    const retryable = isBusy || reply.http === null || reply.http >= 500
    if (!retryable) return stop(`неожиданный ответ HTTP ${reply.http}: ${message}`)

    const pauses = isBusy ? BUSY_PAUSES : ERROR_PAUSES
    const pause = pauses[isBusy ? busy++ : errors++]
    retries.push({ http: reply.http, error: message || 'нет ответа', at: startedAt.toISOString() })
    if (pause === undefined) return stop(`после ${retries.length} повторов нет ответа (${message || `HTTP ${reply.http}`})`)
    if (stopRequested) return null
    console.log(`    ${isBusy ? 'занято' : `HTTP ${reply.http ?? '—'}: ${message || 'нет ответа'}`} — повтор через ${pause} с`)
    await sleep(pause * 1000 * pauseScale)
  }
}

function stop(reason: string): null {
  console.error(`Остановка: ${reason}`)
  process.exitCode = 1
  return null
}

const startedAt = Date.now()
let completed = 0
for (const [i, task] of todo.entries()) {
  if (stopRequested) break
  const record = await run(task)
  if (!record) break
  appendFileSync(runsPath, JSON.stringify(record) + '\n')
  completed++
  const left = todo.length - i - 1
  const eta = Math.round((((Date.now() - startedAt) / completed) * left) / 60_000)
  const position = `[${tasks.length - todo.length + i + 1}/${tasks.length}]`
  console.log(
    `${position} ${task.model} п${task.rep} ${task.prompt.id.padEnd(28)} ${task.mode.padEnd(8)} ${record.outcome}, ` +
      `попыток ${record.attempts}, ${record.seconds} с${left ? `, осталось ~${eta} мин` : ''}`,
  )
}

console.log(`Сделано за этот запуск: ${completed}. Всего готово: ${tasks.length - todo.length + completed} из ${tasks.length}`)
if (completed < todo.length) console.log('Продолжить — та же команда: готовые запуски будут пропущены')
