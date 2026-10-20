// Ожидание «в очереди» при генерации сайта: у GigaChat для физлица один поток, и если нейросеть занята,
// функция generate-site отвечает code: busy. Повторяем сами, но не дольше maxWaitMs — потом понятное сообщение.
// Без Supabase: вызов функции передаётся параметром (generateSite.ts), поэтому логика проверяется тестами.
import type { BusinessName } from '../dsl/schema/frontmatter'
import type { GenerationModel, Outcome } from '../dsl/generate'
import type { PromptMode } from '../dsl/prompt'

export interface GenerateRequest {
  description: string
  business?: BusinessName
  mode: PromptMode
  model: GenerationModel
}

/** Ответ generate-site при успешном запуске (документа может не быть — тогда есть message). */
export interface GenerateResponse {
  runId: string
  outcome: Outcome
  markdown: string | null
  message: string | null
  attempts: number
}

/** Один вызов функции: ответ или ошибка с текстом для пользователя. busy — повторить позже, limit — не повторять. */
export type GenerateReply = { data: GenerateResponse } | { error: string; code?: 'busy' | 'limit' }

/** generating — нейросеть составляет сайт; queued — нейросеть занята, ждём своей очереди */
export type GenerateStatus = 'generating' | 'queued'

export interface QueueOptions {
  invoke: (request: GenerateRequest, signal?: AbortSignal) => Promise<GenerateReply>
  onStatus?: (status: GenerateStatus) => void
  signal?: AbortSignal
  /** Сколько всего ждать своей очереди */
  maxWaitMs?: number
  /** Пауза между повторами */
  retryDelayMs?: number
  now?: () => number
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

export const MAX_QUEUE_WAIT_MS = 2 * 60_000
export const QUEUE_RETRY_DELAY_MS = 10_000

export const BUSY_TOO_LONG = 'Нейросеть всё ещё занята другими запросами. Попробуйте через несколько минут — описание сохранится в форме'

/** Ошибка с текстом для пользователя. */
export class GenerateError extends Error {}

function abortError(): DOMException {
  return new DOMException('Генерация отменена', 'AbortError')
}

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(abortError())
    }, { once: true })
  })

/** Вызывает генерацию, при «занято» повторяет. Бросает GenerateError с понятным текстом или AbortError при отмене. */
export async function generateWithQueue(
  request: GenerateRequest,
  {
    invoke,
    onStatus,
    signal,
    maxWaitMs = MAX_QUEUE_WAIT_MS,
    retryDelayMs = QUEUE_RETRY_DELAY_MS,
    now = Date.now,
    sleep = defaultSleep,
  }: QueueOptions,
): Promise<GenerateResponse> {
  const started = now()
  onStatus?.('generating')
  for (;;) {
    if (signal?.aborted) throw abortError()
    const reply = await invoke(request, signal)
    if ('data' in reply) return reply.data
    if (reply.code !== 'busy') throw new GenerateError(reply.error)
    // Следующий повтор не должен начаться позже, чем через maxWaitMs от первого запроса
    if (now() + retryDelayMs - started > maxWaitMs) throw new GenerateError(BUSY_TOO_LONG)
    onStatus?.('queued')
    await sleep(retryDelayMs, signal)
  }
}
