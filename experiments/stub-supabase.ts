// Локальная заглушка Supabase для проверки run-generation.ts и export-logs.ts без GigaChat и без расхода лимита:
// вход по паролю и обновление токена (/auth/v1/token), функция generate-site, чтение generation_logs по run_id
// (только свои строки — как RLS). Ответы модели выдуманы, журнал — в памяти процесса.
//
//   STUB_TOKEN_TTL=5 STUB_FAIL=busy@2,500@4,net@6 node experiments/stub-supabase.ts
//   EXP_SUPABASE_URL=http://localhost:54329 EXP_SUPABASE_ANON_KEY=stub EXP_EMAIL=exp@stub EXP_PASSWORD=stub \
//     EXP_PAUSE_SCALE=0.001 node experiments/run-generation.ts --out /tmp/exp1-stub --reps 1 --only b01-clean
//
// STUB_PORT (54329), STUB_PASSWORD (stub), STUB_TOKEN_TTL — срок токена, с (3600);
// STUB_FAIL — ответы по номеру вызова функции: busy@N, 500@N, net@N (обрыв соединения), limit@N, 401@N, 400@N,
//   chat502@N — функция отвечает 200, но GigaChat внутри ответил 502 (outcome model-error, технический сбой);
// STUB_MIX_VERSIONS=1 — у каждого пятого запуска другая pipeline_version (проверка предупреждения выгрузки);
// STUB_WRONG_MODEL=имя — запросы к этой модели «отвечает» GigaChat-2 (проверка предупреждения о подмене).

import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.STUB_PORT ?? 54329)
const PASSWORD = process.env.STUB_PASSWORD ?? 'stub'
const TOKEN_TTL = Number(process.env.STUB_TOKEN_TTL ?? 3600)
const MIX_VERSIONS = process.env.STUB_MIX_VERSIONS === '1'
const WRONG_MODEL = process.env.STUB_WRONG_MODEL
const MODELS = ['GigaChat-2-Pro', 'GigaChat-2', 'GigaChat-2-Max', 'GigaChat-3-Lightning', 'GigaChat-3-Pro', 'GigaChat-3-Ultra']
const failures = new Map(
  (process.env.STUB_FAIL ?? '').split(',').filter(Boolean).map((item) => {
    const [kind, n] = item.split('@')
    return [Number(n), kind]
  }),
)

const tokens = new Map<string, { userId: string; expires: number }>()
const refreshTokens = new Map<string, string>()
const logs: Record<string, unknown>[] = []
let calls = 0

function issue(userId: string) {
  const access = `stub.${randomUUID()}`
  const refresh = randomUUID()
  tokens.set(access, { userId, expires: Date.now() + TOKEN_TTL * 1000 })
  refreshTokens.set(refresh, userId)
  return { access_token: access, refresh_token: refresh, expires_in: TOKEN_TTL, user: { id: userId } }
}

function userOf(req: IncomingMessage): string | null {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const entry = tokens.get(token)
  return entry && entry.expires > Date.now() ? entry.userId : null
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = ''
  for await (const chunk of req) text += chunk
  return text ? JSON.parse(text) : {}
}

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

/** Выдуманный запуск: 1–3 попытки, строки model и autofix — как logRows в src/dsl/generate.ts. */
function fakeRun(userId: string, input: Record<string, unknown>, runNo: number, chat502 = false) {
  const runId = randomUUID()
  const attempts = pick([1, 1, 1, 2, 3])
  const outcome = attempts === 3 && Math.random() < 0.5 ? 'max-attempts' : 'valid'
  const pipeline = MIX_VERSIONS && runNo % 5 === 0 ? 'mixed0000000' : 'edc3f00780a2'
  const markdown = `---\nname: Заглушка ${runNo}\n---\n\n## Услуги\n:::services\ntitle: Стрижка\nprice: ${1000 + runNo}\n:::\n`
  const common = {
    run_id: runId,
    user_id: userId,
    site_id: null,
    kind: 'generate',
    mode: input.mode,
    model: input.model,
    business: input.business ?? null,
    prompt: String(input.description).trim(),
    prompt_version: 'stubprompt01',
    prompt_base_version: input.mode === 'json' ? 'stubjson0001' : 'stubmd000001',
    pipeline_version: pipeline,
    params: { temperature: 0.2, max_tokens: 4000 },
    outcome,
    created_at: new Date().toISOString(),
  }
  if (chat502) {
    logs.push({
      ...common, outcome: 'model-error', attempt: 1, stage: 'model', request: common.prompt, reached_model: true, output: '',
      diagnostics: [], errors_count: 0, warnings_count: 0, missing_data_count: 0, fixed_codes: [], finish_reason: null,
      error: 'Chat 502: <html>\n<head><title>502 Bad Gateway</title></head>', tokens_in: null, tokens_out: null,
      precached_prompt_tokens: null, response_model: null, latency_ms: 3000, is_final: true,
    })
    return { runId, outcome: 'model-error', markdown: null, message: 'Нейросеть не ответила', attempts: 1 }
  }
  for (let a = 1; a <= attempts; a++) {
    const last = a === attempts
    const modelErrors = last ? pick([0, 0, 1]) : 2
    const finalErrors = last && outcome === 'valid' ? 0 : 1
    const shared = { ...common, attempt: a, request: a === 1 ? common.prompt : 'Исправь: …', reached_model: true }
    logs.push({
      ...shared, stage: 'model', output: '```markdown\n' + markdown + '```', diagnostics: [], errors_count: modelErrors,
      warnings_count: 1, missing_data_count: 1, fixed_codes: [], finish_reason: 'stop', error: null,
      tokens_in: 120 + a, tokens_out: 300 + runNo % 50, precached_prompt_tokens: 4096,
      response_model: input.model === WRONG_MODEL ? 'GigaChat-2:2.0.28.2' : `${input.model}:3.1.25.3`, latency_ms: 3000 + Math.round(Math.random() * 9000), is_final: false,
    })
    logs.push({
      ...shared, stage: 'autofix', output: markdown, diagnostics: [], errors_count: finalErrors, warnings_count: 1,
      missing_data_count: 1, fixed_codes: modelErrors ? ['unclosed-frontmatter'] : [], finish_reason: null, error: null,
      tokens_in: null, tokens_out: null, precached_prompt_tokens: null, response_model: null, latency_ms: null, is_final: last,
    })
  }
  return { runId, outcome, markdown, message: null, attempts }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!req.headers.apikey && url.pathname !== '/functions/v1/generate-site') return send(res, 401, { message: 'No API key found in request' })

  if (req.method === 'POST' && url.pathname === '/auth/v1/token') {
    const body = await readBody(req)
    if (url.searchParams.get('grant_type') === 'password') {
      if (body.password !== PASSWORD) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
      return send(res, 200, issue(`00000000-0000-4000-8000-${String(body.email).length.toString().padStart(12, '0')}`))
    }
    const userId = refreshTokens.get(String(body.refresh_token))
    if (!userId) return send(res, 400, { error: 'invalid_grant' })
    refreshTokens.delete(String(body.refresh_token))
    console.log('заглушка: токен обновлён')
    return send(res, 200, issue(userId))
  }

  if (req.method === 'POST' && url.pathname === '/functions/v1/generate-site') {
    const n = ++calls
    const failure = failures.get(n)
    console.log(`заглушка: вызов ${n}${failure ? ` → ${failure}` : ''}`)
    if (failure === 'net') return req.socket.destroy()
    if (failure === 'busy') return send(res, 503, { error: 'Нейросеть сейчас занята', code: 'busy' })
    if (failure === '500') return send(res, 500, { error: 'Не удалось составить сайт. Попробуйте позже' })
    if (failure === 'limit') return send(res, 429, { error: 'Предел на сегодня исчерпан', code: 'limit' })
    if (failure === '400') return send(res, 400, { error: 'Неизвестная модель' })
    const userId = userOf(req)
    if (!userId || failure === '401') return send(res, 401, { error: 'Сессия истекла — войдите в аккаунт заново' })
    const body = await readBody(req)
    if (!MODELS.includes(String(body.model))) return send(res, 400, { error: 'Неизвестная модель' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    return send(res, 200, fakeRun(userId, body, n, failure === 'chat502'))
  }

  if (req.method === 'GET' && url.pathname === '/rest/v1/generation_logs') {
    const userId = userOf(req)
    if (!userId) return send(res, 401, { message: 'JWT expired' })
    const ids = new Set((url.searchParams.get('run_id') ?? '').replace(/^in\.\(|\)$/g, '').split(',').filter(Boolean))
    // RLS: только свои строки
    return send(res, 200, logs.filter((row) => ids.has(String(row.run_id)) && row.user_id === userId))
  }

  send(res, 404, { error: 'not found' })
})

server.listen(PORT, () => console.log(`заглушка Supabase: http://localhost:${PORT}`))
