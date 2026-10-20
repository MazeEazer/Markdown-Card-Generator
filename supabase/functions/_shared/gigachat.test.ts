// Тесты клиента GigaChat без сети: fetch подменяется. Запуск:
//   npm run test:functions
import { assertEquals, assertInstanceOf, assertRejects } from '@std/assert'
import { ModelNotReachedError } from '../../../src/dsl/generate.ts'
import { API_URL, callGigaChat, GigaChatError } from './gigachat.ts'
import { gigachatModel, gigachatParams } from './gigachatModel.ts'

Deno.env.set('GIGACHAT_AUTH_KEY', 'test-key')
Deno.env.delete('GIGACHAT_CA_CERT_B64') // обычный TLS — клиент берёт глобальный fetch

type Handler = (body: Record<string, unknown>, init: RequestInit) => Response | Promise<Response>

/** Подменяет fetch: OAuth выдаёт токен, на чат отвечают обработчики по очереди. */
function stubFetch(...chat: Handler[]) {
  const sent: { body: Record<string, unknown>; init: RequestInit }[] = []
  let oauthCalls = 0
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (String(input).includes('/oauth')) {
      oauthCalls++
      return Response.json({ access_token: `token-${oauthCalls}`, expires_at: Date.now() + 30 * 60_000 })
    }
    if (String(input) !== `${API_URL}/chat/completions`) throw new Error(`неожиданный адрес ${input}`)
    const body = JSON.parse(String(init.body))
    sent.push({ body, init })
    return chat[Math.min(sent.length - 1, chat.length - 1)](body, init)
  }) as typeof fetch
  return { sent, oauthCalls: () => oauthCalls, restore: () => (globalThis.fetch = original) }
}

const ok = (content: string, finish = 'stop') => () =>
  Response.json({
    choices: [{ message: { content }, finish_reason: finish }],
    usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
    model: 'GigaChat-2-Pro',
  })
const status = (code: number) => () => new Response('ошибка', { status: code })

Deno.test('старый вызов без новых параметров работает: max_tokens не уходит', async () => {
  const stub = stubFetch(ok('привет'))
  try {
    const result = await callGigaChat('система', 'вопрос')
    assertEquals(result.text, 'привет')
    assertEquals(result.finishReason, 'stop')
    assertEquals(result.usage?.prompt_tokens, 120)
    assertEquals(stub.sent[0].body.model, 'GigaChat-2')
    assertEquals(stub.sent[0].body.temperature, 0.3)
    assertEquals('max_tokens' in stub.sent[0].body, false)
    assertEquals(stub.sent[0].init.signal, undefined)
  } finally {
    stub.restore()
  }
})

Deno.test('temperature, max_tokens и таймаут уходят в запрос; finish_reason length возвращается', async () => {
  const stub = stubFetch(ok('обрезано', 'length'))
  try {
    const result = await callGigaChat('с', 'у', { model: 'GigaChat-2-Max', temperature: 0.2, maxTokens: 4000, timeoutMs: 5000 })
    assertEquals(result.finishReason, 'length')
    assertEquals(stub.sent[0].body.model, 'GigaChat-2-Max')
    assertEquals(stub.sent[0].body.temperature, 0.2)
    assertEquals(stub.sent[0].body.max_tokens, 4000)
    assertInstanceOf(stub.sent[0].init.signal, AbortSignal)
  } finally {
    stub.restore()
  }
})

for (const [code, kind] of [[429, 'busy'], [401, 'unavailable'], [500, 'http'], [400, 'http']] as const) {
  Deno.test(`ответ ${code} → GigaChatError ${kind}`, async () => {
    const stub = stubFetch(status(code))
    try {
      const error = await assertRejects(() => callGigaChat('с', 'у'), GigaChatError)
      assertEquals([error.kind, error.status], [kind, code])
    } finally {
      stub.restore()
    }
  })
}

Deno.test('401 — токен сбрасывается, следующий вызов получает новый', async () => {
  const stub = stubFetch(status(401), ok('да'))
  try {
    await assertRejects(() => callGigaChat('с', 'у'), GigaChatError)
    const before = stub.oauthCalls()
    await callGigaChat('с', 'у')
    assertEquals(stub.oauthCalls(), before + 1)
    assertEquals(stub.sent[1].init.headers && (stub.sent[1].init.headers as Record<string, string>).Authorization, `Bearer token-${stub.oauthCalls()}`)
  } finally {
    stub.restore()
  }
})

Deno.test('не дождались ответа — timeout (запрос до модели дошёл)', async () => {
  const stub = stubFetch((_body, init) =>
    new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason))))
  try {
    const error = await assertRejects(() => callGigaChat('с', 'у', { timeoutMs: 50 }), GigaChatError)
    assertEquals(error.kind, 'timeout')
  } finally {
    stub.restore()
  }
})

Deno.test('нет соединения — unavailable', async () => {
  const stub = stubFetch(() => {
    throw new TypeError('error sending request: connection refused')
  })
  try {
    const error = await assertRejects(() => callGigaChat('с', 'у'), GigaChatError)
    assertEquals(error.kind, 'unavailable')
  } finally {
    stub.restore()
  }
})

Deno.test('ответ не JSON — http (модель ответила)', async () => {
  const stub = stubFetch(() => new Response('<html>', { status: 200 }))
  try {
    const error = await assertRejects(() => callGigaChat('с', 'у'), GigaChatError)
    assertEquals(error.kind, 'http')
  } finally {
    stub.restore()
  }
})

Deno.test('gigachatModel: параметры из GENERATION_PARAMS, токены usage, finish_reason', async () => {
  const stub = stubFetch(ok('---\nname: A\n---\n'))
  try {
    const model = gigachatModel('GigaChat-2-Pro')
    const reply = await model([{ role: 'system', content: 'с' }, { role: 'user', content: 'у' }], { timeoutMs: 5000 })
    assertEquals(reply, { text: '---\nname: A\n---\n', finishReason: 'stop', tokensIn: 120, tokensOut: 30 })
    assertEquals(stub.sent[0].body.temperature, gigachatParams().temperature)
    assertEquals(stub.sent[0].body.max_tokens, gigachatParams().max_tokens)
    assertEquals(stub.sent[0].body.model, 'GigaChat-2-Pro')
  } finally {
    stub.restore()
  }
})

const messages = [{ role: 'system' as const, content: 'с' }, { role: 'user' as const, content: 'у' }]

Deno.test('gigachatModel: 429 — повтор после паузы', async () => {
  const stub = stubFetch(status(429), ok('да'))
  try {
    const reply = await gigachatModel('GigaChat-2', { busyRetryDelaysMs: [10] })(messages, { timeoutMs: 5000 })
    assertEquals(reply.text, 'да')
    assertEquals(stub.sent.length, 2)
  } finally {
    stub.restore()
  }
})

Deno.test('gigachatModel: всё время 429 → ModelNotReachedError busy', async () => {
  const stub = stubFetch(status(429))
  try {
    const error = await assertRejects(() => gigachatModel('GigaChat-2', { busyRetryDelaysMs: [10, 10] })(messages, { timeoutMs: 5000 }), ModelNotReachedError)
    assertEquals(error.reason, 'busy')
    assertEquals(stub.sent.length, 3)
  } finally {
    stub.restore()
  }
})

Deno.test('gigachatModel: на паузу не хватает времени до дедлайна — без повтора', async () => {
  const stub = stubFetch(status(429))
  try {
    await assertRejects(() => gigachatModel('GigaChat-2', { busyRetryDelaysMs: [10_000] })(messages, { timeoutMs: 1000 }), ModelNotReachedError)
    assertEquals(stub.sent.length, 1)
  } finally {
    stub.restore()
  }
})

Deno.test('gigachatModel: таймаут и ошибка модели пробрасываются — запрос дошёл', async () => {
  const stub = stubFetch(status(500))
  try {
    const error = await assertRejects(() => gigachatModel('GigaChat-2')(messages, { timeoutMs: 5000 }), GigaChatError)
    assertEquals(error.kind, 'http')
  } finally {
    stub.restore()
  }
})

Deno.test('gigachatModel: история диалога не поддерживается', async () => {
  await assertRejects(
    () => gigachatModel('GigaChat-2')([...messages, { role: 'assistant', content: 'а' }], { timeoutMs: 1000 }),
    Error,
    'ровно два сообщения',
  )
})
