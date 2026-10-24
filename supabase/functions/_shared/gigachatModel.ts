// GigaChat как ChatModel для цикла generateSite (src/dsl/generate.ts).
// Параметры генерации — из GENERATION_PARAMS; «занято» и «нет доступа» → ModelNotReachedError
// (запуск не расходует лимит), остальные ошибки пробрасываются как есть — запрос до модели дошёл.

import { type ChatModel, GENERATION_PARAMS, ModelNotReachedError } from '../../../src/dsl/generate.ts'
import { callGigaChat, GigaChatError } from './gigachat.ts'

/** Паузы перед повтором при 429: у физлица один поток — соседний запрос обычно заканчивается за секунды. */
const BUSY_RETRY_DELAYS_MS = [2000, 4000]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Что реально уходит в GigaChat при каждом вызове — для колонки params журнала. */
export function gigachatParams(): Record<string, unknown> {
  return { temperature: GENERATION_PARAMS.temperature, max_tokens: GENERATION_PARAMS.maxTokens }
}

export function gigachatModel(model: string, { busyRetryDelaysMs = BUSY_RETRY_DELAYS_MS } = {}): ChatModel {
  return async (messages, { timeoutMs }) => {
    // generateSite отправляет системный промпт и одно сообщение — историю диалога клиент не поддерживает
    const [system, user, ...rest] = messages
    if (system?.role !== 'system' || user?.role !== 'user' || rest.length) {
      throw new Error('gigachatModel: ожидаются ровно два сообщения — system и user')
    }

    const deadline = Date.now() + timeoutMs
    for (let retry = 0; ; retry++) {
      try {
        const result = await callGigaChat(system.content, user.content, {
          model,
          temperature: GENERATION_PARAMS.temperature,
          maxTokens: GENERATION_PARAMS.maxTokens,
          timeoutMs: Math.max(1, deadline - Date.now()),
        })
        return {
          text: result.text,
          finishReason: result.finishReason,
          tokensIn: result.usage?.prompt_tokens,
          tokensOut: result.usage?.completion_tokens,
          tokensPrecached: result.usage?.precached_prompt_tokens,
          responseModel: result.model,
        }
      } catch (error) {
        if (!(error instanceof GigaChatError)) throw error
        const delay = busyRetryDelaysMs[retry]
        // Занято — подождать и повторить, если до дедлайна хватает времени
        if (error.kind === 'busy' && delay !== undefined && Date.now() + delay < deadline) {
          await sleep(delay)
          continue
        }
        if (error.kind === 'busy' || error.kind === 'unavailable') throw new ModelNotReachedError(error.message, error.kind)
        throw error
      }
    }
  }
}
