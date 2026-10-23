// Песочница генерации (/playground): доступ, черновик описания и разбор журнала запуска.
// Без React и Supabase — чтобы проверялось тестами. Запрос к generation_logs делает компонент.
import { dropEmptyJsonFields, extractDocument } from '../dsl/generate'
import type { PromptMode } from '../dsl/prompt'
import { documentSchema } from '../dsl/schema/document'
import { fromJson } from '../dsl/fromJson'
import { serialize } from '../dsl/serialize'

export const PLAYGROUND_PATH = '/playground'
export const DRAFT_KEY = 'mdcard.playground.description'

/**
 * Песочница — для режима разработки и для пользователей из списка VITE_PLAYGROUND_USER_IDS (user_id через запятую;
 * это те же id, что в секрете GENERATION_UNLIMITED_USERS на сервере, но сам секрет во фронтенд не попадает).
 * Лимиты всё равно проверяет функция, это лишь вопрос показа страницы.
 */
export function playgroundAllowed(userId: string | undefined, options: { dev: boolean; ids?: string }): boolean {
  if (options.dev) return true
  if (!userId) return false
  return (options.ids ?? '').split(/[\s,]+/).filter(Boolean).includes(userId)
}

export function isPlaygroundPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === PLAYGROUND_PATH
}

/** localStorage может быть недоступен или переполнен (приватное окно, запрет сайта) — страница работает и без него. */
export function loadDraft(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): string {
  try {
    return storage?.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDraft(text: string, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(DRAFT_KEY, text)
  } catch {
    // не сохранилось — не страшно
  }
}

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Строка generation_logs — только нужные песочнице поля. */
export interface RunLogRow {
  stage: 'model' | 'autofix'
  attempt: number
  is_final: boolean
  output: string | null
  fixed_codes: string[] | null
  prompt_version: string
  pipeline_version: string
  response_model: string | null
  latency_ms: number | null
  tokens_in: number | null
  tokens_out: number | null
  errors_count: number
  warnings_count: number
}

export const RUN_LOG_COLUMNS =
  'stage, attempt, is_final, output, fixed_codes, prompt_version, pipeline_version, response_model, latency_ms, tokens_in, tokens_out, errors_count, warnings_count'

export interface FixedCode {
  code: string
  count: number
  label: string
}

export interface RunSummary {
  promptVersion: string
  pipelineVersion: string
  responseModel: string | null
  latencyMs: number | null
  tokens: { in: number | null; out: number | null }
  errors: number
  warnings: number
  /** Что сделала обработка: код → сколько раз (журнал fixed_codes итоговой попытки) */
  fixedCodes: FixedCode[]
  /** Строки ответа модели, которых нет в итоговом документе: убраны или изменены обработкой */
  removedLines: string[]
}

const CODE_LABELS: Record<string, string> = {
  'ungrounded-contact': 'контакт или адрес, которого нет в описании, убран',
  'ungrounded-number': 'цена, длительность или часы, которых нет в описании, убраны',
  'ungrounded-currency': 'валюта, которой нет в описании, убрана',
  'placeholder-value': 'заглушка вместо значения убрана',
  'empty-field': 'пустое поле убрано',
  'hours-empty': 'блок часов без разбираемых строк убран',
  'empty-block': 'пустой блок убран',
  'map-no-address': 'карта без адреса убрана',
  'ungrounded-amenity': 'удобство, которого нет в описании, убрано',
  'ungrounded-amenity-text': 'число в уточнении удобства, которого нет в описании, — уточнение убрано',
  'ungrounded-review': 'отзыв (или его автор, оценка, дата), которых нет в описании, убран',
  'map-added': 'добавлена карта «Как добраться» (адрес в шапке есть, карты не было)',
  'contacts-block-empty': 'блок контактов без контактов убран',
  'json-null-field': 'поле JSON со значением null или "" убрано',
  'phone-format': 'телефон приведён к виду +7 999 123-45-67',
  'primary-unknown': 'главный контакт указывал на несуществующий — убран',
  'unclosed-frontmatter': 'шапка закрыта `---`',
  'accent-low-contrast': 'акцентный цвет исправлен для читаемости',
}

export function countFixedCodes(codes: readonly string[]): FixedCode[] {
  const counts = new Map<string, number>()
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1)
  return [...counts].map(([code, count]) => ({ code, count, label: CODE_LABELS[code] ?? code }))
}

/** Ответ модели в виде разметки до обработки: markdown — сам текст, json — через схему. null, если не разобрался. */
export function markdownBeforeFixes(output: string, mode: PromptMode): string | null {
  const document = extractDocument(output, mode)
  if (mode === 'markdown') return document
  try {
    const parsed = documentSchema.safeParse(dropEmptyJsonFields(JSON.parse(document)).value)
    return parsed.success ? serialize(fromJson(parsed.data)) : null
  } catch {
    return null
  }
}

const isStructural = (line: string) => line === '' || line === '---' || line === ':::'

/** Строки из before, которых больше, чем в after (с учётом повторов), в порядке появления. */
export function removedLines(before: string, after: string): string[] {
  const left = new Map<string, number>()
  for (const raw of after.split('\n')) {
    const line = raw.trim()
    left.set(line, (left.get(line) ?? 0) + 1)
  }
  const removed: string[] = []
  for (const raw of before.split('\n')) {
    const line = raw.trim()
    if (isStructural(line)) continue
    const rest = left.get(line) ?? 0
    if (rest > 0) left.set(line, rest - 1)
    else removed.push(line)
  }
  return removed
}

/**
 * Журнал запуска → сводка. Итоговая строка — та, что с is_final: autofix лучшей попытки; если документа не было,
 * model последней. Для «что убрала обработка» берём ответ модели той же попытки.
 */
export function summarizeRun(rows: readonly RunLogRow[], mode: PromptMode, finalMarkdown: string | null): RunSummary | null {
  const final = rows.find((row) => row.is_final) ?? rows.at(-1)
  if (!final) return null
  const modelRow = rows.find((row) => row.stage === 'model' && row.attempt === final.attempt)
  const autofix = final.stage === 'autofix' ? final : undefined
  const before = modelRow?.output ? markdownBeforeFixes(modelRow.output, mode) : null
  return {
    promptVersion: final.prompt_version,
    pipelineVersion: final.pipeline_version,
    responseModel: modelRow?.response_model ?? null,
    latencyMs: modelRow?.latency_ms ?? null,
    tokens: { in: modelRow?.tokens_in ?? null, out: modelRow?.tokens_out ?? null },
    errors: final.errors_count,
    warnings: final.warnings_count,
    fixedCodes: countFixedCodes(autofix?.fixed_codes ?? []),
    removedLines: before !== null && finalMarkdown !== null ? removedLines(before, finalMarkdown) : [],
  }
}
