// Публикация сгенерированного сайта на Vercel.
// Токен Vercel живёт только здесь, в секретах Supabase — в браузер он не попадает.
// Секреты:
//   VERCEL_TOKEN    — токен доступа Vercel (обязательно)
//   VERCEL_TEAM_ID  — команда Vercel, если проекты создаются не в личном аккаунте (необязательно)
// Вход: POST { siteId, html } с JWT пользователя. Выход: { url } или { error }.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const VERCEL_API = 'https://api.vercel.com'
const MAX_HTML_BYTES = 5 * 1024 * 1024
const POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Ошибка, текст которой можно показать пользователю. */
class PublicError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

/** Проверяет, что пользователь вошёл и сайт принадлежит ему. */
async function assertSiteOwner(authHeader: string | null, siteId: string): Promise<void> {
  if (!authHeader) throw new PublicError('Войдите в аккаунт, чтобы публиковать сайты', 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
  if (userError || !userData.user) throw new PublicError('Сессия истекла — войдите в аккаунт заново', 401)

  const { data: site, error } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) throw new Error(`Не удалось проверить сайт: ${error.message}`)
  if (!site) throw new PublicError('Сайт не найден среди ваших сайтов', 404)
}

/** Обёртка над Vercel API: токен и teamId подставляются автоматически. */
function vercelClient(token: string, teamId: string | undefined) {
  return async (path: string, init: RequestInit = {}) => {
    const url = new URL(path, VERCEL_API)
    if (teamId) url.searchParams.set('teamId', teamId)

    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }
}

async function deploy(html: string, siteId: string): Promise<string> {
  const token = Deno.env.get('VERCEL_TOKEN')
  if (!token) throw new Error('Секрет VERCEL_TOKEN не задан')
  const vercel = vercelClient(token, Deno.env.get('VERCEL_TEAM_ID') || undefined)

  const projectName = `md-card-${siteId.replace(/-/g, '').slice(0, 8)}`

  // 1. Находим проект или создаём новый
  let project = await vercel(`/v9/projects/${projectName}`)
  if (!project.ok) {
    project = await vercel('/v9/projects', {
      method: 'POST',
      body: JSON.stringify({ name: projectName, framework: null }),
    })
    if (!project.ok) throw new Error(`Vercel: не удалось создать проект — ${project.data.error?.message ?? project.status}`)
  }

  // 2. Деплой в production
  const deployment = await vercel('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: projectName,
      project: project.data.id,
      target: 'production',
      files: [{ file: 'index.html', data: html }],
    }),
  })
  if (!deployment.ok) throw new Error(`Vercel: деплой не создан — ${deployment.data.error?.message ?? deployment.status}`)

  // 3. Ждём готовности
  const deploymentId = deployment.data.uid ?? deployment.data.id
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const status = await vercel(`/v13/deployments/${deploymentId}`)
    if (status.data.readyState === 'READY') break
    if (status.data.readyState === 'ERROR') throw new PublicError('Vercel не смог собрать сайт, попробуйте ещё раз', 502)
  }

  // Стабильный адрес проекта, а не адрес конкретного деплоя
  return `https://${project.data.name}.vercel.app`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

  try {
    const body = await req.json().catch(() => null)
    const siteId = typeof body?.siteId === 'string' ? body.siteId : ''
    const html = typeof body?.html === 'string' ? body.html : ''

    if (!siteId || !html) throw new PublicError('Не хватает данных для публикации')
    if (new TextEncoder().encode(html).length > MAX_HTML_BYTES) {
      throw new PublicError('Сайт слишком большой для публикации (больше 5 МБ). Уменьшите картинки')
    }

    await assertSiteOwner(req.headers.get('Authorization'), siteId)
    const url = await deploy(html, siteId)
    return json({ url })
  } catch (err) {
    console.error('deploy-vercel:', err)
    if (err instanceof PublicError) return json({ error: err.message }, err.status)
    return json({ error: 'Не удалось опубликовать сайт. Попробуйте позже' }, 500)
  }
})
