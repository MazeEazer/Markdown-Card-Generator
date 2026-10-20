import { describe, expect, it } from 'vitest'
import {
  BUSY_TOO_LONG,
  type GenerateReply,
  type GenerateRequest,
  type GenerateResponse,
  type GenerateStatus,
  generateWithQueue,
  GenerateError,
} from './generateQueue'

const REQUEST: GenerateRequest = { description: 'Барбершоп «Борода», стрижка 1500', mode: 'markdown', model: 'GigaChat-2-Pro' }
const RESPONSE: GenerateResponse = { runId: 'run-1', outcome: 'valid', markdown: '---\nname: Борода\n---\n', message: null, attempts: 1 }
const BUSY: GenerateReply = { error: 'Нейросеть сейчас занята другим запросом', code: 'busy' }

/** Поддельные часы и функция: отвечает по сценарию, sleep двигает часы. */
function setup(...replies: GenerateReply[]) {
  let clock = 0
  const statuses: GenerateStatus[] = []
  const calls: number[] = []
  return {
    statuses,
    calls,
    options: {
      invoke: async () => {
        calls.push(clock)
        clock += 6_000 // функция сама ждёт 2 + 4 с перед ответом «занято»
        return replies[Math.min(calls.length - 1, replies.length - 1)]
      },
      onStatus: (status: GenerateStatus) => statuses.push(status),
      now: () => clock,
      sleep: async (ms: number) => {
        clock += ms
      },
    },
  }
}

describe('generateWithQueue', () => {
  it('ответ сразу — один вызов, статус «составляем»', async () => {
    const { options, statuses, calls } = setup({ data: RESPONSE })
    expect(await generateWithQueue(REQUEST, options)).toEqual(RESPONSE)
    expect(calls).toHaveLength(1)
    expect(statuses).toEqual(['generating'])
  })

  it('занято — «в очереди», повтор через 10 с, затем ответ', async () => {
    const { options, statuses, calls } = setup(BUSY, BUSY, { data: RESPONSE })
    expect(await generateWithQueue(REQUEST, options)).toEqual(RESPONSE)
    expect(calls).toEqual([0, 16_000, 32_000])
    expect(statuses).toEqual(['generating', 'queued', 'queued'])
  })

  it('занято дольше 2 минут — понятное сообщение, последний повтор не позже 2 минут от начала', async () => {
    const { options, calls } = setup(BUSY)
    await expect(generateWithQueue(REQUEST, options)).rejects.toEqual(new GenerateError(BUSY_TOO_LONG))
    expect(calls.at(-1)).toBeLessThanOrEqual(120_000)
    expect(calls).toHaveLength(8)
  })

  it('лимит и другие ошибки — без повтора, текст с сервера', async () => {
    const { options, calls } = setup({ error: 'Сегодня вы уже создали 20 сайтов', code: 'limit' })
    await expect(generateWithQueue(REQUEST, options)).rejects.toEqual(new GenerateError('Сегодня вы уже создали 20 сайтов'))
    expect(calls).toHaveLength(1)
  })

  it('отмена во время ожидания очереди — AbortError, без новых вызовов', async () => {
    const controller = new AbortController()
    const { options, calls } = setup(BUSY)
    const promise = generateWithQueue(REQUEST, {
      ...options,
      signal: controller.signal,
      sleep: undefined, // настоящий sleep: прерывается сигналом
      retryDelayMs: 60_000,
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toHaveLength(1)
  })

  it('уже отменённый запрос не отправляется', async () => {
    const controller = new AbortController()
    controller.abort()
    const { options, calls } = setup({ data: RESPONSE })
    await expect(generateWithQueue(REQUEST, { ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toEqual([])
  })
})
