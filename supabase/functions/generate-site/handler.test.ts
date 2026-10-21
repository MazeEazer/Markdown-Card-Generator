// Тесты функции generate-site без Supabase и GigaChat: зависимости подменяются. Запуск — npm run test:functions
import { assertEquals, assertMatch, assertNotEquals } from '@std/assert'
import { type ChatModel, type GenerationLogRow, ModelNotReachedError, pipelineFingerprint } from '../../../src/dsl/generate.ts'
import { buildSystemPrompt } from '../../../src/dsl/prompt.ts'
import { promptVersion } from '../_shared/promptVersion.ts'
import { createHandler, type Deps } from './handler.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const SITE = '22222222-2222-4222-8222-222222222222'
const NOW = Date.parse('2026-10-19T12:00:00Z')
const VALID = '---\nname: Борода\nphone: +7 999 123-45-67\n---\n\n## Услуги\n:::services\ntitle: Стрижка\nprice: 1500\n:::\n'
const DESCRIPTION = 'Барбершоп «Борода», стрижка 1500 рублей, телефон +7 999 123-45-67'

function fakeDeps(overrides: Partial<Deps> = {}, reply: () => ReturnType<ChatModel> = async () => ({ text: VALID, finishReason: 'stop' })) {
  const calls = { countRuns: [] as Date[], models: [] as string[], logs: [] as GenerationLogRow[] }
  const deps: Deps = {
    getUserId: async (auth) => (auth === 'Bearer good' ? USER : null),
    siteBelongsToUser: async (_auth, siteId) => siteId === SITE,
    countRuns: async (_user, since) => {
      calls.countRuns.push(since)
      return 0
    },
    insertLogs: async (rows) => {
      calls.logs.push(...rows)
    },
    model: (name) => {
      calls.models.push(name)
      return () => reply()
    },
    params: { temperature: 0.2, max_tokens: 4000 },
    dailyLimit: 20,
    unlimitedUsers: new Set(),
    now: () => NOW,
    randomUUID: () => 'run-1',
    ...overrides,
  }
  return { handler: createHandler(deps), calls }
}

const post = (body: unknown, auth: string | null = 'Bearer good') =>
  new Request('http://localhost/generate-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  })

async function call(handler: (req: Request) => Promise<Response>, req: Request) {
  const res = await handler(req)
  return { status: res.status, body: await res.json().catch(() => null) }
}

Deno.test('OPTIONS — ответ для CORS', async () => {
  const res = await fakeDeps().handler(new Request('http://localhost', { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('без входа и с истёкшей сессией — 401', async () => {
  const { handler } = fakeDeps()
  assertEquals((await call(handler, post({ description: DESCRIPTION }, null))).status, 401)
  const expired = await call(handler, post({ description: DESCRIPTION }, 'Bearer old'))
  assertEquals(expired.status, 401)
  assertMatch(expired.body.error, /Сессия истекла/)
})

Deno.test('проверка входных данных — 400 с понятным текстом', async () => {
  const { handler, calls } = fakeDeps()
  for (const body of [
    {},
    { description: 'кратко' },
    { description: 'я'.repeat(3001) },
    { description: DESCRIPTION, model: 'GPT-5' },
    { description: DESCRIPTION, mode: 'yaml' },
    { description: DESCRIPTION, business: 'bakery' },
    { description: DESCRIPTION, siteId: 'not-uuid' },
  ]) {
    const { status, body: res } = await call(handler, post(body))
    assertEquals(status, 400, JSON.stringify(body))
    assertMatch(res.error, /[а-яё]/i)
  }
  assertEquals(calls.models, [])
})

Deno.test('чужой сайт — 404, до модели не доходим', async () => {
  const { handler, calls } = fakeDeps()
  const res = await call(handler, post({ description: DESCRIPTION, siteId: '33333333-3333-4333-8333-333333333333' }))
  assertEquals(res.status, 404)
  assertEquals(calls.models, [])
})

Deno.test('лимит исчерпан — 429 с code: limit; окно — последние 24 часа', async () => {
  const { handler, calls } = fakeDeps({ countRuns: async (_u, since) => (calls.countRuns.push(since), 20) })
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 429)
  assertEquals(res.body.code, 'limit')
  assertMatch(res.body.error, /Предел на сегодня исчерпан/)
  assertEquals(calls.countRuns.map((d) => d.toISOString()), ['2026-10-18T12:00:00.000Z'])
  assertEquals(calls.models, [])
})

Deno.test('пользователь из GENERATION_UNLIMITED_USERS — лимит не проверяется', async () => {
  const { handler, calls } = fakeDeps({ unlimitedUsers: new Set([USER]), countRuns: async () => 1000 })
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 200)
  assertEquals(calls.countRuns, [])
})

Deno.test('успех: документ, исход и журнал с prompt_version, params и одной итоговой строкой', async () => {
  const { handler, calls } = fakeDeps()
  const res = await call(handler, post({ description: `  ${DESCRIPTION}  `, business: 'barbershop', siteId: SITE, mode: 'markdown', model: 'GigaChat-2-Pro' }))
  assertEquals(res.status, 200)
  assertEquals(res.body, { runId: 'run-1', outcome: 'valid', markdown: VALID, message: null, attempts: 1 })
  assertEquals(calls.models, ['GigaChat-2-Pro'])

  const version = await promptVersion(buildSystemPrompt({ mode: 'markdown', business: 'barbershop' }))
  const base = await promptVersion(buildSystemPrompt({ mode: 'markdown' }))
  const pipeline = await promptVersion(pipelineFingerprint())
  assertEquals(calls.logs.map((r) => [r.stage, r.is_final]), [['model', false], ['autofix', true]])
  for (const row of calls.logs) {
    assertEquals(
      [row.run_id, row.user_id, row.site_id, row.kind, row.mode, row.model, row.business, row.prompt, row.prompt_version, row.params],
      ['run-1', USER, SITE, 'generate', 'markdown', 'GigaChat-2-Pro', 'barbershop', DESCRIPTION, version, { temperature: 0.2, max_tokens: 4000 }],
    )
    // Версия с нишей своя, общая версия режима и версия обработки — одинаковы для всех запусков режима
    assertEquals([row.prompt_base_version, row.pipeline_version], [base, pipeline])
  }
  assertNotEquals(version, base)
})

Deno.test('режим json и выбранная модель доходят до генерации', async () => {
  const { handler, calls } = fakeDeps({}, async () => ({ text: '{"name": "Борода", "sections": []}' }))
  const res = await call(handler, post({ description: DESCRIPTION, mode: 'json', model: 'GigaChat-3-Pro' }))
  assertEquals(res.status, 200)
  assertEquals(calls.models, ['GigaChat-3-Pro'])
  assertEquals(calls.logs[0].mode, 'json')
  assertEquals(calls.logs[0].prompt_version, await promptVersion(buildSystemPrompt({ mode: 'json' })))
})

Deno.test('GigaChat-3-Ultra принимается (эксперимент 1), неизвестная модель — 400', async () => {
  const { handler, calls } = fakeDeps({}, async () => ({ text: '{"name": "Борода", "sections": []}' }))
  const res = await call(handler, post({ description: DESCRIPTION, mode: 'json', model: 'GigaChat-3-Ultra' }))
  assertEquals(res.status, 200)
  assertEquals(calls.models, ['GigaChat-3-Ultra'])
  assertEquals((await call(handler, post({ description: DESCRIPTION, model: 'GigaChat-4' }))).status, 400)
})

Deno.test('по умолчанию — GigaChat-3-Ultra и режим json', async () => {
  const { handler, calls } = fakeDeps()
  await call(handler, post({ description: DESCRIPTION }))
  assertEquals(calls.models, ['GigaChat-3-Ultra'])
  assertEquals(calls.logs[0].mode, 'json')
})

Deno.test('нейросеть занята — 503 с code: busy, попытка записана с reached_model = false', async () => {
  const { handler, calls } = fakeDeps({}, () => Promise.reject(new ModelNotReachedError('Chat 429', 'busy')))
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 503)
  assertEquals(res.body.code, 'busy')
  assertEquals(calls.logs.map((r) => [r.reached_model, r.is_final, r.error]), [[false, true, 'Chat 429']])
})

Deno.test('документа нет (отказ фильтра) — 200 с markdown: null и понятным сообщением', async () => {
  const { handler, calls } = fakeDeps({}, async () => ({ text: 'Не могу', finishReason: 'blacklist' }))
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 200)
  assertEquals([res.body.outcome, res.body.markdown], ['blacklist', null])
  assertMatch(res.body.message, /другими словами/)
  assertEquals(calls.logs.length, 1)
})

Deno.test('журнал не записался — сайт всё равно отдаётся', async () => {
  const { handler } = fakeDeps({ insertLogs: () => Promise.reject(new Error('db down')) })
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 200)
  assertEquals(res.body.markdown, VALID)
})

Deno.test('сбой до вызова модели — 500 без подробностей, журнал пуст (лимит не расходуется)', async () => {
  const { handler, calls } = fakeDeps({ countRuns: () => Promise.reject(new Error('timeout')) })
  const res = await call(handler, post({ description: DESCRIPTION }))
  assertEquals(res.status, 500)
  assertEquals(res.body, { error: 'Не удалось составить сайт. Попробуйте позже' })
  assertEquals(calls.logs, [])
})
