// AI-генерация сайта по описанию: цикл «генерация → проверка → исправление» (src/dsl/generate.ts)
// с GigaChat, лимитом в сутки и журналом generation_logs. Логика — в handler.ts.
// Секреты и переменные:
//   GIGACHAT_AUTH_KEY, GIGACHAT_CA_CERT_B64 — доступ к GigaChat (см. _shared/gigachat.ts)
//   GENERATION_DAILY_LIMIT      — запусков в сутки на пользователя (по умолчанию 20)
//   GENERATION_UNLIMITED_USERS  — user_id без лимита через запятую (для эксперимента)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — встроенные переменные Supabase.
//   Не путать с пользовательским секретом SERVICE_ROLE_KEY: в нём лежит anon-ключ (PLAN.md, этап 0).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { gigachatModel, gigachatParams } from '../_shared/gigachatModel.ts'
import { createHandler, DEFAULT_DAILY_LIMIT } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

// Service role — только для записи журнала и подсчёта лимита: журнал — измерительные данные эксперимента,
// пользователь не должен ни подделать, ни удалить записи. Всё остальное — от имени пользователя (его JWT).
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const userClient = (authHeader: string) => createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })

function dailyLimit(): number {
  const value = Number(Deno.env.get('GENERATION_DAILY_LIMIT'))
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_DAILY_LIMIT
}

const unlimitedUsers = new Set(
  (Deno.env.get('GENERATION_UNLIMITED_USERS') ?? '').split(/[\s,]+/).filter(Boolean),
)

Deno.serve(createHandler({
  async getUserId(authHeader) {
    const { data, error } = await userClient(authHeader).auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    return error || !data.user ? null : data.user.id
  },

  async siteBelongsToUser(authHeader, siteId, userId) {
    const { data, error } = await userClient(authHeader)
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Не удалось проверить сайт: ${error.message}`)
    return Boolean(data)
  },

  // Запуск считается, если хотя бы одно обращение дошло до модели (занято/429 лимит не расходует)
  async countRuns(userId, since) {
    const { data, error } = await admin
      .from('generation_logs')
      .select('run_id')
      .eq('user_id', userId)
      .eq('kind', 'generate')
      .eq('reached_model', true)
      .gte('created_at', since.toISOString())
    if (error) throw new Error(`Не удалось посчитать лимит: ${error.message}`)
    return new Set(data.map((row) => row.run_id)).size
  },

  async insertLogs(rows) {
    const { error } = await admin.from('generation_logs').insert(rows)
    if (error) throw new Error(error.message)
  },

  model: (name) => gigachatModel(name),
  params: gigachatParams(),
  dailyLimit: dailyLimit(),
  unlimitedUsers,
  now: Date.now,
  randomUUID: () => crypto.randomUUID(),
}))
