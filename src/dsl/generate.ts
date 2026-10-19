// Цикл «генерация → проверка → исправление» (этап 5). Чистая функция: вызов нейросети передаётся
// параметром, поэтому цикл проверяется тестами без сети, а Edge Function остаётся тонкой обёрткой.
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

/**
 * Автоисправления, которые вставляют заглушку вместо данных («Моё название»).
 * Их не применяем: настоящее название знает нейросеть из описания.
 */
const MODEL_FIXES: ReadonlySet<string> = new Set(['missing-frontmatter', 'missing-name'])

/** Сколько ошибок перечислять в запросе на исправление: длинный список модель всё равно не осилит. */
const MAX_ERRORS_IN_REQUEST = 15

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

/** Одна попытка — одна строка журнала generation_logs. */
export interface Attempt {
  /** С 1 */
  attempt: number
  /** Запрос пользователя этой попытки: описание или просьба исправить */
  request: string
  /** Ответ нейросети как есть */
  output: string
  /** Документ после автоисправлений; null — ответ не удалось превратить в документ (JSON не разобран) */
  markdown: string | null
  /** Все замечания к документу; если документа нет — почему (коды json-syntax, json-schema) */
  diagnostics: Diagnostic[]
  errorsCount: number
  /** Ошибки до автоисправлений — сколько из них исправил валидатор без нейросети */
  errorsBeforeFixes: number
  /** Коды применённых автоисправлений */
  fixedByRules: string[]
  finishReason?: string
  tokensIn?: number
  tokensOut?: number
  latencyMs: number
}

/**
 * Чем закончился цикл:
 * valid — ошибок нет; max-attempts — попытки кончились; no-progress — исправление не уменьшило число ошибок;
 * deadline — вышло общее время; blacklist — нейросеть отказалась отвечать; length — ответ обрезан;
 * model-error — нейросеть не ответила на повторной попытке.
 */
export type Outcome = 'valid' | 'max-attempts' | 'no-progress' | 'deadline' | 'blacklist' | 'length' | 'model-error'

export interface GenerationResult {
  outcome: Outcome
  attempts: Attempt[]
  /** Лучшая попытка с документом (меньше всего ошибок), а не последняя; null — документа нет ни в одной */
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
  /** Часы — подменяются в тестах */
  now?: () => number
}

/** Сообщение для пользователя: что получилось, если не всё гладко. null — всё хорошо. */
export function outcomeMessage(outcome: Outcome, best: Attempt | null): string | null {
  if (!best) {
    if (outcome === 'blacklist') return 'Нейросеть отказалась составлять сайт по этому описанию. Попробуйте описать бизнес другими словами'
    if (outcome === 'length') return 'Ответ нейросети оборвался на середине. Сократите описание и попробуйте ещё раз'
    if (outcome === 'deadline') return 'Нейросеть отвечала слишком долго. Попробуйте ещё раз через минуту'
    return 'Не получилось составить сайт по описанию. Попробуйте ещё раз или опишите бизнес подробнее'
  }
  if (outcome === 'length') return 'Ответ нейросети оборвался — возможно, сайт обрезан в конце. Проверьте последние разделы или сократите описание'
  if (best.errorsCount === 0) return null
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

function jsonIssue(code: 'json-syntax' | 'json-schema', message: string): Diagnostic {
  return { from: 0, to: 0, severity: 'error', code, message }
}

function zodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => (typeof key === 'number' ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key)), '')
}

interface Checked {
  document: string
  markdown: string | null
  diagnostics: Diagnostic[]
  errorsBeforeFixes: number
  fixedByRules: string[]
}

/** Разметка → автоисправления → замечания. */
function checkMarkdown(text: string): Omit<Checked, 'document'> {
  const errorsBeforeFixes = errorsOf(validate(text)).length
  const fixed = applyAllFixes(text, { skip: MODEL_FIXES })
  return {
    markdown: fixed.text,
    diagnostics: validate(fixed.text),
    errorsBeforeFixes,
    fixedByRules: fixed.applied.map((d) => d.code),
  }
}

/** Ответ нейросети → документ и замечания. В режиме json: JSON → схема → CardData → разметка. */
function check(output: string, mode: PromptMode): Checked {
  const document = extractDocument(output, mode)
  if (mode === 'markdown') return { document, ...checkMarkdown(document) }

  const failed = (diagnostics: Diagnostic[]): Checked => ({
    document,
    markdown: null,
    diagnostics,
    errorsBeforeFixes: diagnostics.length,
    fixedByRules: [],
  })
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
  return { document, ...checkMarkdown(serialize(fromJson(parsed.data))) }
}

/** Строка с ошибкой для запроса на исправление: «строка 12 («price: abc»): сообщение». */
function describeError(markdown: string | null, d: Diagnostic): string {
  if (markdown === null) return `- ${d.message}`
  const { line } = offsetToLineCol(markdown, d.from)
  const content = markdown.split('\n')[line - 1]?.trim()
  return `- строка ${line}${content ? ` («${content}»)` : ''}: ${d.message}`
}

/** Запрос на исправление: исходное описание, текущий документ и ошибки с номерами строк. */
export function buildFixRequest(description: string, mode: PromptMode, checked: Pick<Checked, 'document' | 'markdown' | 'diagnostics'>): string {
  const errors = errorsOf(checked.diagnostics)
  const listed = errors.slice(0, MAX_ERRORS_IN_REQUEST).map((d) => describeError(checked.markdown, d))
  if (errors.length > listed.length) listed.push(`- и ещё ${errors.length - listed.length}`)

  // В режиме markdown показываем документ уже после автоисправлений — чтобы модель их не откатила.
  // В режиме json ошибки разметки ссылаются на строки собранного документа — показываем и его.
  const current = mode === 'markdown' ? checked.markdown! : checked.document
  const parts = [
    `Описание бизнеса от пользователя:\n${description}`,
    `Твой ответ:\n${current}`,
  ]
  if (mode === 'json' && checked.markdown !== null) parts.push(`Из него получился документ MD Card:\n${checked.markdown}`)
  parts.push(
    `Ошибки:\n${listed.join('\n')}`,
    mode === 'markdown'
      ? 'Исправь эти ошибки и верни документ целиком. Остальное не меняй и не добавляй фактов, которых нет в описании. Ответ — только документ на языке MD Card, начиная со строки ---.'
      : 'Исправь эти ошибки и верни JSON целиком. Остальное не меняй и не добавляй фактов, которых нет в описании. Ответ — только JSON-объект по схеме.',
  )
  return parts.join('\n\n')
}

/** Насколько далеко ответ прошёл проверку: 0 — есть документ, 1 — JSON не прошёл схему, 2 — не JSON. */
function stage(a: Attempt): number {
  if (a.markdown !== null) return 0
  return a.diagnostics.some((d) => d.code === 'json-syntax') ? 2 : 1
}

/** Попытка a лучше b: дальше прошла проверку, затем меньше ошибок, затем меньше предупреждений. */
function better(a: Attempt, b: Attempt): boolean {
  const score = (x: Attempt) => [stage(x), x.errorsCount, x.diagnostics.filter((d) => d.severity === 'warning').length]
  const [sa, sb] = [score(a), score(b)]
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] < sb[i]
  return false
}

/** Прогресс — дальше прошла проверку или на том же этапе меньше ошибок. */
function progressed(a: Attempt, b: Attempt): boolean {
  if (stage(a) !== stage(b)) return stage(a) < stage(b)
  return a.errorsCount < b.errorsCount
}

/**
 * Генерирует сайт по описанию. Ошибка нейросети на первой попытке пробрасывается (до модели не дошли —
 * пусть решает вызывающий код); на следующих — цикл останавливается и возвращает лучшее из готового.
 */
export async function generateSite({
  description,
  mode,
  business,
  model,
  maxAttempts = MAX_ATTEMPTS,
  deadlineMs,
  now = Date.now,
}: GenerateOptions): Promise<GenerationResult> {
  const system = buildSystemPrompt({ mode, business })
  const deadline = now() + deadlineMs
  const attempts: Attempt[] = []
  let best: Attempt | null = null
  let lastChecked: Checked | null = null

  const result = (outcome: Outcome): GenerationResult => ({
    outcome,
    attempts,
    best: best?.markdown === null ? null : best,
  })

  for (let n = 1; n <= maxAttempts; n++) {
    const timeoutMs = deadline - now()
    if (timeoutMs <= 0) return result('deadline')

    // Каждый запрос — без истории: системный промпт и одно сообщение со всем нужным
    const request = lastChecked ? buildFixRequest(description, mode, lastChecked) : `Описание бизнеса:\n${description}`
    const started = now()
    let reply: ModelReply
    try {
      reply = await model([{ role: 'system', content: system }, { role: 'user', content: request }], { timeoutMs })
    } catch (error) {
      if (n === 1) throw error
      return result(now() >= deadline ? 'deadline' : 'model-error')
    }
    const latencyMs = now() - started

    const base = {
      attempt: n,
      request,
      output: reply.text,
      finishReason: reply.finishReason,
      tokensIn: reply.tokensIn,
      tokensOut: reply.tokensOut,
      latencyMs,
    }
    // Отказ фильтра — текст ответа не документ, проверять нечего
    if (reply.finishReason === 'blacklist') {
      attempts.push({ ...base, markdown: null, diagnostics: [], errorsCount: 0, errorsBeforeFixes: 0, fixedByRules: [] })
      return result('blacklist')
    }

    const checked = check(reply.text, mode)
    const attempt: Attempt = {
      ...base,
      markdown: checked.markdown,
      diagnostics: checked.diagnostics,
      errorsCount: errorsOf(checked.diagnostics).length,
      errorsBeforeFixes: checked.errorsBeforeFixes,
      fixedByRules: checked.fixedByRules,
    }
    attempts.push(attempt)

    const previousBest = best
    if (!best || better(attempt, best)) best = attempt

    if (reply.finishReason === 'length') return result('length')
    if (attempt.markdown !== null && attempt.errorsCount === 0) return result('valid')
    if (previousBest && !progressed(attempt, previousBest)) return result('no-progress')
    lastChecked = checked
  }
  return result('max-attempts')
}
