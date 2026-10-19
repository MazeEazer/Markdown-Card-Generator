// Цикл «генерация → проверка → исправление» (этап 5). Чистая функция: вызов нейросети передаётся
// параметром, поэтому цикл проверяется тестами без сети, а Edge Function остаётся тонкой обёрткой.
import { MISSING_DATA_CODES, MODEL_FIXABLE_CODES } from './codes.ts'
import { applyAllFixes } from './fix.ts'
import { fromJson } from './fromJson.ts'
import { offsetToLineCol } from './position.ts'
import { buildSystemPrompt, type PromptMode } from './prompt.ts'
import { documentSchema } from './schema/document.ts'
import type { BusinessName } from './schema/frontmatter.ts'
import { serialize } from './serialize.ts'
import type { Diagnostic } from './types.ts'
import { validate } from './validate.ts'

/** Параметры генерации — в одном месте: одинаковы для всех запусков и пишутся в журнал. */
export const GENERATION_PARAMS = {
  /** Низкая — чтобы повторный запуск того же описания давал похожий результат */
  temperature: 0.2,
  /** Сайт-визитка с запасом умещается; больше — признак того, что модель «зациклилась» */
  maxTokens: 4000,
} as const

export type GenerationParams = typeof GENERATION_PARAMS

export const MAX_ATTEMPTS = 3

/** Модели для генерации (этап 1: доступны у физлица). Первая — по умолчанию. */
export const GENERATION_MODELS = ['GigaChat-2-Pro', 'GigaChat-2', 'GigaChat-2-Max', 'GigaChat-3-Lightning', 'GigaChat-3-Pro'] as const
export type GenerationModel = (typeof GENERATION_MODELS)[number]
export const DEFAULT_MODEL: GenerationModel = GENERATION_MODELS[0]

/**
 * Автоисправления, которые вставляют заглушку вместо данных («Моё название»).
 * Их не применяем: настоящее название знает нейросеть из описания.
 */
const MODEL_FIXES: ReadonlySet<string> = new Set(['missing-frontmatter', 'missing-name'])

/** Сколько замечаний перечислять в запросе на исправление: длинный список модель всё равно не осилит. */
const MAX_ISSUES_IN_REQUEST = 15

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelReply {
  text: string
  /** stop — ответ закончен; length — обрезан по maxTokens; blacklist — сработал фильтр GigaChat */
  finishReason?: string
  tokensIn?: number
  tokensOut?: number
}

/** Вызов нейросети. timeoutMs — сколько осталось до общего дедлайна цикла. */
export type ChatModel = (messages: ChatMessage[], options: { timeoutMs: number }) => Promise<ModelReply>

/**
 * Запрос до нейросети не дошёл: busy — занято (429, у физлица один поток), unavailable — не получили
 * доступ (токен, сеть до отправки). Такой запуск не расходует дневной лимит.
 */
export class ModelNotReachedError extends Error {
  readonly reason: 'busy' | 'unavailable'
  constructor(message: string, reason: 'busy' | 'unavailable') {
    super(message)
    this.reason = reason
  }
}

/** Счётчики для журнала. missingData — замечания «нехватки данных» любой важности (codes.ts). */
export interface DiagnosticCounts {
  errors: number
  warnings: number
  missingData: number
}

export function countDiagnostics(diagnostics: Diagnostic[]): DiagnosticCounts {
  return {
    errors: diagnostics.filter((d) => d.severity === 'error').length,
    warnings: diagnostics.filter((d) => d.severity === 'warning').length,
    missingData: diagnostics.filter((d) => MISSING_DATA_CODES.has(d.code)).length,
  }
}

/** Документ на одном этапе проверки — одна строка журнала (stage: model или autofix). */
export interface CheckedStage {
  /** model — ответ нейросети как есть; autofix — документ после автоисправлений */
  output: string
  /** Замечания; если документа нет — почему (коды json-syntax, json-schema) */
  diagnostics: Diagnostic[]
  counts: DiagnosticCounts
}

/** Одно обращение к нейросети, в том числе неудачное. */
export interface Attempt {
  /** С 1 */
  attempt: number
  /** Запрос пользователя этой попытки: описание или просьба исправить */
  request: string
  /** false — запрос до нейросети не дошёл (занято), лимит не расходуется */
  reachedModel: boolean
  /** Почему нет ответа: ошибка сети, таймаут, занято */
  error?: string
  finishReason?: string
  tokensIn?: number
  tokensOut?: number
  latencyMs: number
  /** Ответ и замечания до автоисправлений. В режиме json — к документу, собранному из JSON */
  model: CheckedStage
  /** После автоисправлений; null — документа нет (нет ответа, JSON не разобран, отказ) */
  autofix: (CheckedStage & { fixedCodes: string[] }) | null
}

/**
 * Чем закончился цикл:
 * valid — в лучшей попытке нет ошибок; max-attempts — попытки кончились; no-progress — исправление
 * не уменьшило число ошибок; deadline — вышло общее время; blacklist — нейросеть отказалась отвечать;
 * length — ответ обрезан; busy — нейросеть занята; model-error — нейросеть не ответила.
 */
export type Outcome = 'valid' | 'max-attempts' | 'no-progress' | 'deadline' | 'blacklist' | 'length' | 'busy' | 'model-error'

export interface GenerationResult {
  outcome: Outcome
  /** Системный промпт как он ушёл нейросети — от него считается prompt_version в журнале */
  systemPrompt: string
  attempts: Attempt[]
  /** Лучшая попытка с документом (меньше ошибок, затем меньше исправимых предупреждений); null — документа нет */
  best: Attempt | null
}

export interface GenerateOptions {
  description: string
  mode: PromptMode
  business?: BusinessName
  model: ChatModel
  maxAttempts?: number
  /** Общее время на весь цикл, мс */
  deadlineMs: number
  /** Предел одного запроса к нейросети, мс; фактический — не больше времени до дедлайна */
  requestTimeoutMs?: number
  /** Новую попытку не начинать, если до дедлайна осталось меньше, мс: ответ всё равно не успеет */
  minAttemptMs?: number
  /** Часы — подменяются в тестах */
  now?: () => number
}

/** Сообщение для пользователя: что получилось, если не всё гладко. null — всё хорошо. */
export function outcomeMessage(outcome: Outcome, best: Attempt | null): string | null {
  if (!best) {
    switch (outcome) {
      case 'blacklist':
        return 'Нейросеть отказалась составлять сайт по этому описанию. Попробуйте описать бизнес другими словами'
      case 'length':
        return 'Ответ нейросети оборвался на середине. Сократите описание и попробуйте ещё раз'
      case 'deadline':
        return 'Нейросеть отвечала слишком долго. Попробуйте ещё раз через минуту'
      case 'busy':
        return 'Нейросеть сейчас занята другим запросом. Попробуйте ещё раз через минуту'
      default:
        return 'Не получилось составить сайт по описанию. Попробуйте ещё раз или опишите бизнес подробнее'
    }
  }
  if (outcome === 'length' && best.finishReason === 'length') {
    return 'Ответ нейросети оборвался — возможно, сайт обрезан в конце. Проверьте последние разделы или сократите описание'
  }
  if (best.autofix!.counts.errors === 0) return null
  return 'Сайт составлен, но в разметке остались ошибки — они подсвечены в редакторе'
}

/** Ответ без обёртки: убирает ```…``` вокруг и пояснения до документа. */
export function extractDocument(output: string, mode: PromptMode): string {
  let text = output.trim()
  const fenced = text.match(/```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```/)
  if (fenced) text = fenced[1].trim()

  if (mode === 'json') {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    return start >= 0 && end > start ? text.slice(start, end + 1) : text
  }
  // «Вот ваш сайт:\n---\nname: …» — пояснение до шапки отбрасываем
  if (!text.startsWith('---')) {
    const header = text.search(/^---[ \t]*$/m)
    if (header > 0) text = text.slice(header)
  }
  return text.endsWith('\n') ? text : `${text}\n`
}

const errorsOf = (diagnostics: Diagnostic[]) => diagnostics.filter((d) => d.severity === 'error')

/** Предупреждения, которые нейросеть может исправить без новых данных. */
const fixableOf = (diagnostics: Diagnostic[]) =>
  diagnostics.filter((d) => d.severity !== 'error' && MODEL_FIXABLE_CODES.has(d.code))

const stageOf = (output: string, diagnostics: Diagnostic[]): CheckedStage => ({
  output,
  diagnostics,
  counts: countDiagnostics(diagnostics),
})

function jsonIssue(code: 'json-syntax' | 'json-schema', message: string): Diagnostic {
  return { from: 0, to: 0, severity: 'error', code, message }
}

function zodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => (typeof key === 'number' ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key)), '')
}

interface Checked {
  /** Ответ без обёртки: разметка или JSON — его показываем нейросети в запросе на исправление */
  document: string
  model: CheckedStage
  autofix: Attempt['autofix']
}

/** Разметка → замечания до и после автоисправлений. */
function checkMarkdown(output: string, markdown: string): Omit<Checked, 'document'> {
  const fixed = applyAllFixes(markdown, { skip: MODEL_FIXES })
  return {
    model: stageOf(output, validate(markdown)),
    autofix: { ...stageOf(fixed.text, validate(fixed.text)), fixedCodes: fixed.applied.map((d) => d.code) },
  }
}

/** Ответ нейросети → документ и замечания. В режиме json: JSON → схема → CardData → разметка. */
function check(output: string, mode: PromptMode): Checked {
  const document = extractDocument(output, mode)
  if (mode === 'markdown') return { document, ...checkMarkdown(output, document) }

  const failed = (diagnostics: Diagnostic[]): Checked => ({ document, model: stageOf(output, diagnostics), autofix: null })
  let json: unknown
  try {
    json = JSON.parse(document)
  } catch (error) {
    return failed([jsonIssue('json-syntax', `Ответ — не JSON: ${(error as Error).message}`)])
  }
  const parsed = documentSchema.safeParse(json)
  if (!parsed.success) {
    return failed(parsed.error.issues.map((issue) => jsonIssue('json-schema', `${zodPath(issue.path) || 'документ'}: ${issue.message}`)))
  }
  return { document, ...checkMarkdown(output, serialize(fromJson(parsed.data))) }
}

/** Строка замечания для запроса на исправление: «строка 12 («price: abc»): сообщение». */
function describeIssue(markdown: string | null, d: Diagnostic): string {
  if (markdown === null) return `- ${d.message}`
  const { line } = offsetToLineCol(markdown, d.from)
  const content = markdown.split('\n')[line - 1]?.trim()
  return `- строка ${line}${content ? ` («${content}»)` : ''}: ${d.message}`
}

/**
 * Запрос на исправление: исходное описание, текущий документ, ошибки с номерами строк и отдельным списком —
 * исправимые предупреждения. Замечания «нехватки данных» не попадают никогда.
 */
export function buildFixRequest(description: string, mode: PromptMode, checked: Pick<Checked, 'document' | 'model' | 'autofix'>): string {
  const markdown = checked.autofix?.output ?? null
  const diagnostics = checked.autofix?.diagnostics ?? checked.model.diagnostics
  const errors = errorsOf(diagnostics)
  // Ошибки важнее: предупреждения — только в оставшееся место списка
  const warnings = fixableOf(diagnostics).slice(0, Math.max(0, MAX_ISSUES_IN_REQUEST - errors.length))
  const listed = (items: Diagnostic[], limit: number) => {
    const lines = items.slice(0, limit).map((d) => describeIssue(markdown, d))
    if (items.length > limit) lines.push(`- и ещё ${items.length - limit}`)
    return lines.join('\n')
  }

  // В режиме markdown показываем документ уже после автоисправлений — чтобы модель их не откатила.
  // В режиме json замечания к разметке ссылаются на строки собранного документа — показываем и его.
  const parts = [
    `Описание бизнеса от пользователя:\n${description}`,
    `Твой ответ:\n${mode === 'markdown' ? markdown : checked.document}`,
  ]
  if (mode === 'json' && markdown !== null) parts.push(`Из него получился документ MD Card:\n${markdown}`)
  parts.push(errors.length ? `Ошибки — исправь обязательно:\n${listed(errors, MAX_ISSUES_IN_REQUEST)}` : 'Ошибок нет.')
  if (warnings.length) parts.push(`Желательно исправить:\n${listed(warnings, warnings.length)}`)
  parts.push(
    'Исправь перечисленное. Остальное не меняй. Не добавляй фактов, которых нет в описании: если для исправления нужны такие данные — убери поле или строку.',
    mode === 'markdown'
      ? 'Верни документ целиком. Ответ — только документ на языке MD Card, начиная со строки ---.'
      : 'Верни JSON целиком. Ответ — только JSON-объект по схеме.',
  )
  return parts.join('\n\n')
}

/** Насколько далеко ответ прошёл проверку: 0 — есть документ, 1 — JSON не прошёл схему, 2 — не JSON, 3 — нет ответа. */
function progressStage(a: Attempt): number {
  if (a.autofix) return 0
  if (!a.model.diagnostics.length) return 3
  return a.model.diagnostics.some((d) => d.code === 'json-syntax') ? 2 : 1
}

const errorsCount = (a: Attempt) => a.autofix?.counts.errors ?? a.model.counts.errors

/** Попытка a лучше b: дальше прошла проверку, затем меньше ошибок, затем меньше исправимых предупреждений. */
function better(a: Attempt, b: Attempt): boolean {
  const score = (x: Attempt) => [progressStage(x), errorsCount(x), fixableOf(x.autofix?.diagnostics ?? []).length]
  const [sa, sb] = [score(a), score(b)]
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] < sb[i]
  return false
}

/** Прогресс — дальше прошла проверку или на том же этапе меньше ошибок. */
function progressed(a: Attempt, b: Attempt): boolean {
  if (progressStage(a) !== progressStage(b)) return progressStage(a) < progressStage(b)
  return errorsCount(a) < errorsCount(b)
}

const EMPTY_STAGE: CheckedStage = { output: '', diagnostics: [], counts: { errors: 0, warnings: 0, missingData: 0 } }

/**
 * Генерирует сайт по описанию. Каждое обращение к нейросети — попытка в результате, в том числе неудачное.
 * Исключение бросается только из-за ошибки в нашем коде до вызова нейросети.
 */
export async function generateSite({
  description,
  mode,
  business,
  model,
  maxAttempts = MAX_ATTEMPTS,
  deadlineMs,
  requestTimeoutMs = Infinity,
  minAttemptMs = 0,
  now = Date.now,
}: GenerateOptions): Promise<GenerationResult> {
  const system = buildSystemPrompt({ mode, business })
  const deadline = now() + deadlineMs
  const attempts: Attempt[] = []
  let best: Attempt | null = null
  let lastChecked: Checked | null = null
  // Когда ошибок нет, на исправимые предупреждения — не больше одной попытки
  let warningsPassUsed = false

  const result = (outcome: Outcome): GenerationResult => {
    const document = best?.autofix ? best : null
    // Попытки кончились или застряли на предупреждениях, но лучшая — без ошибок
    if ((outcome === 'no-progress' || outcome === 'max-attempts') && document?.autofix!.counts.errors === 0) outcome = 'valid'
    return { outcome, systemPrompt: system, attempts, best: document }
  }

  for (let n = 1; n <= maxAttempts; n++) {
    const remaining = deadline - now()
    // Первую попытку начинаем всегда — без неё нечего показать; следующие — если успеют
    if (remaining <= 0 || (n > 1 && remaining < minAttemptMs)) return result('deadline')
    const timeoutMs = Math.min(requestTimeoutMs, remaining)

    // Каждый запрос — без истории: системный промпт и одно сообщение со всем нужным
    const request = lastChecked ? buildFixRequest(description, mode, lastChecked) : `Описание бизнеса:\n${description}`
    const started = now()
    let reply: ModelReply
    try {
      reply = await model([{ role: 'system', content: system }, { role: 'user', content: request }], { timeoutMs })
    } catch (error) {
      const notReached = error instanceof ModelNotReachedError
      attempts.push({
        attempt: n,
        request,
        reachedModel: !notReached,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: now() - started,
        model: EMPTY_STAGE,
        autofix: null,
      })
      if (notReached) return result(error.reason === 'busy' ? 'busy' : 'model-error')
      return result(now() >= deadline ? 'deadline' : 'model-error')
    }

    const base = {
      attempt: n,
      request,
      reachedModel: true,
      finishReason: reply.finishReason,
      tokensIn: reply.tokensIn,
      tokensOut: reply.tokensOut,
      latencyMs: now() - started,
    }
    // Отказ фильтра — текст ответа не документ, проверять нечего
    if (reply.finishReason === 'blacklist') {
      attempts.push({ ...base, model: { ...EMPTY_STAGE, output: reply.text }, autofix: null })
      return result('blacklist')
    }

    const checked = check(reply.text, mode)
    const attempt: Attempt = { ...base, model: checked.model, autofix: checked.autofix }
    attempts.push(attempt)

    const previousBest = best
    if (!best || better(attempt, best)) best = attempt

    if (reply.finishReason === 'length') return result('length')
    if (attempt.autofix?.counts.errors === 0) {
      const canPolish = !warningsPassUsed && n < maxAttempts && fixableOf(attempt.autofix.diagnostics).length > 0
      if (!canPolish) return result('valid')
      warningsPassUsed = true
    } else if (previousBest && !progressed(attempt, previousBest)) {
      return result('no-progress')
    }
    lastChecked = checked
  }
  return result('max-attempts')
}

/** Данные запуска, общие для всех строк журнала. */
export interface LogContext {
  runId: string
  userId: string
  siteId: string | null
  kind: 'generate' | 'fix'
  mode: PromptMode
  model: string
  business: string | null
  /** Описание пользователя */
  prompt: string
  /** Первые 12 знаков SHA-256 системного промпта (result.systemPrompt) */
  promptVersion: string
  /** Что реально ушло в нейросеть */
  params: Record<string, unknown>
}

/** Строка таблицы generation_logs (миграция 20261019120000_generation_logs.sql). */
export interface GenerationLogRow {
  run_id: string
  user_id: string
  site_id: string | null
  kind: 'generate' | 'fix'
  mode: PromptMode
  model: string
  business: string | null
  prompt: string
  prompt_version: string
  attempt: number
  stage: 'model' | 'autofix'
  request: string
  reached_model: boolean
  output: string | null
  diagnostics: Diagnostic[]
  errors_count: number
  warnings_count: number
  missing_data_count: number
  fixed_codes: string[]
  finish_reason: string | null
  error: string | null
  params: Record<string, unknown>
  tokens_in: number | null
  tokens_out: number | null
  latency_ms: number | null
  outcome: Outcome
  is_final: boolean
}

/**
 * Результат запуска → строки журнала: на каждое обращение к нейросети строка model и, если ответ
 * стал документом, строка autofix. Ровно одна строка is_final: autofix лучшей попытки, а если документа
 * нет ни в одной — model последней. Иначе неудачные запуски выпали бы из выборки эксперимента.
 */
export function logRows(result: GenerationResult, context: LogContext): GenerationLogRow[] {
  const last = result.attempts.at(-1)
  const common = {
    run_id: context.runId,
    user_id: context.userId,
    site_id: context.siteId,
    kind: context.kind,
    mode: context.mode,
    model: context.model,
    business: context.business,
    prompt: context.prompt,
    prompt_version: context.promptVersion,
    params: context.params,
    outcome: result.outcome,
  }
  return result.attempts.flatMap((a) => {
    const shared = { ...common, attempt: a.attempt, request: a.request, reached_model: a.reachedModel }
    const counts = (stage: CheckedStage) => ({
      diagnostics: stage.diagnostics,
      errors_count: stage.counts.errors,
      warnings_count: stage.counts.warnings,
      missing_data_count: stage.counts.missingData,
    })
    const rows: GenerationLogRow[] = [{
      ...shared,
      stage: 'model',
      output: a.model.output || null,
      ...counts(a.model),
      fixed_codes: [],
      finish_reason: a.finishReason ?? null,
      error: a.error ?? null,
      // Токены и время — только у строки model: обращение к нейросети одно
      tokens_in: a.tokensIn ?? null,
      tokens_out: a.tokensOut ?? null,
      latency_ms: a.latencyMs,
      is_final: !result.best && a === last,
    }]
    if (a.autofix) {
      rows.push({
        ...shared,
        stage: 'autofix',
        output: a.autofix.output,
        ...counts(a.autofix),
        fixed_codes: a.autofix.fixedCodes,
        finish_reason: null,
        error: null,
        tokens_in: null,
        tokens_out: null,
        latency_ms: null,
        is_final: a === result.best,
      })
    }
    return rows
  })
}
