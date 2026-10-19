// Логика функции generate-site без Supabase и GigaChat: зависимости передаются снаружи (index.ts),
// поэтому авторизация, лимит и журнал проверяются тестами Deno.
// Вход: POST { description, business?, mode?, model?, siteId? } с JWT пользователя.
// Выход: { runId, outcome, markdown, message, attempts } или { error, code? }.

import {
  type ChatModel,
  DEFAULT_MODEL,
  type GenerationLogRow,
  GENERATION_MODELS,
  type GenerationModel,
  generateSite,
  logRows,
  outcomeMessage,
} from '../../../src/dsl/generate.ts'
import type { PromptMode } from '../../../src/dsl/prompt.ts'
import { BUSINESS_NAMES, type BusinessName } from '../../../src/dsl/schema/frontmatter.ts'
import { promptVersion } from '../_shared/promptVersion.ts'

/** Ответ функции должен уйти за 150 с (request idle timeout Supabase) — 30 с запаса на JWT, лимит и журнал. */
export const DEADLINE_MS = 120_000
/** Предел одного запроса к GigaChat; фактический — не больше времени до дедлайна. */
export const REQUEST_TIMEOUT_MS = 90_000
/** Новую попытку не начинаем, если до дедлайна меньше: ответ не успеет, а токены потратятся. */
export const MIN_ATTEMPT_MS = 20_000
export const DEFAULT_DAILY_LIMIT = 20
const DAY_MS = 24 * 60 * 60 * 1000

const MIN_DESCRIPTION = 10
const MAX_DESCRIPTION = 3000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Deps {
  /** id пользователя по заголовку Authorization или null, если сессия недействительна */
  getUserId(authHeader: string): Promise<string | null>
  /** Сайт принадлежит пользователю — проверка с его JWT, как в deploy-vercel */
  siteBelongsToUser(authHeader: string, siteId: string, userId: string): Promise<boolean>
  /** Сколько запусков generate с обращением к модели у пользователя с момента since */
  countRuns(userId: string, since: Date): Promise<number>
  insertLogs(rows: GenerationLogRow[]): Promise<void>
  model(name: GenerationModel): ChatModel
  /** То, что реально уходит в нейросеть при каждом вызове, — для колонки params */
  params: Record<string, unknown>
  dailyLimit: number
  unlimitedUsers: ReadonlySet<string>
  now(): number
  randomUUID(): string
}

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

/** Ошибка, текст которой можно показать пользователю. code — для фронтенда: busy — повторить, limit — нет. */
class PublicError extends Error {
  readonly status: number
  readonly code?: 'busy' | 'limit'
  constructor(message: string, status = 400, code?: 'busy' | 'limit') {
    super(message)
    this.status = status
    this.code = code
  }
}

interface Input {
  description: string
  business?: BusinessName
  mode: PromptMode
  model: GenerationModel
  siteId?: string
}

function parseInput(body: unknown): Input {
  if (!body || typeof body !== 'object') throw new PublicError('Не получилось прочитать запрос')
  const { description, business, mode = 'markdown', model = DEFAULT_MODEL, siteId } = body as Record<string, unknown>

  if (typeof description !== 'string' || description.trim().length < MIN_DESCRIPTION) {
    throw new PublicError('Опишите бизнес хотя бы одним-двумя предложениями: чем занимаетесь, где, как с вами связаться')
  }
  if (description.length > MAX_DESCRIPTION) {
    throw new PublicError(`Описание слишком длинное — сократите его до ${MAX_DESCRIPTION} символов`)
  }
  if (business !== undefined && !BUSINESS_NAMES.includes(business as BusinessName)) throw new PublicError('Неизвестный вид бизнеса')
  if (mode !== 'markdown' && mode !== 'json') throw new PublicError('Неизвестный режим генерации')
  if (!GENERATION_MODELS.includes(model as GenerationModel)) throw new PublicError('Неизвестная модель')
  if (siteId !== undefined && (typeof siteId !== 'string' || !UUID.test(siteId))) throw new PublicError('Неверный идентификатор сайта')

  return {
    description: description.trim(),
    business: business as BusinessName | undefined,
    mode,
    model: model as GenerationModel,
    siteId: siteId as string | undefined,
  }
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

    try {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) throw new PublicError('Войдите в аккаунт, чтобы создавать сайты', 401)
      const userId = await deps.getUserId(authHeader)
      if (!userId) throw new PublicError('Сессия истекла — войдите в аккаунт заново', 401)

      const input = parseInput(await req.json().catch(() => null))
      if (input.siteId && !(await deps.siteBelongsToUser(authHeader, input.siteId, userId))) {
        throw new PublicError('Сайт не найден среди ваших сайтов', 404)
      }

      if (!deps.unlimitedUsers.has(userId)) {
        const used = await deps.countRuns(userId, new Date(deps.now() - DAY_MS))
        if (used >= deps.dailyLimit) {
          throw new PublicError(`Сегодня вы уже создали ${used} сайтов по описанию — это предел на сутки. Попробуйте завтра или продолжите в редакторе`, 429, 'limit')
        }
      }

      const runId = deps.randomUUID()
      const result = await generateSite({
        description: input.description,
        mode: input.mode,
        business: input.business,
        model: deps.model(input.model),
        deadlineMs: DEADLINE_MS,
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
        minAttemptMs: MIN_ATTEMPT_MS,
        now: deps.now,
      })

      const rows = logRows(result, {
        runId,
        userId,
        siteId: input.siteId ?? null,
        kind: 'generate',
        mode: input.mode,
        model: input.model,
        business: input.business ?? null,
        prompt: input.description,
        promptVersion: await promptVersion(result.systemPrompt),
        params: deps.params,
      })
      try {
        await deps.insertLogs(rows)
      } catch (error) {
        // Журнал — для эксперимента; сайт пользователю всё равно отдаём
        console.error('generate-site: журнал не записан', error)
      }

      // Ни одно обращение не дошло до модели — пусть фронтенд повторит позже («в очереди»)
      if (result.outcome === 'busy' && !result.attempts.some((a) => a.reachedModel)) {
        throw new PublicError(outcomeMessage(result.outcome, null)!, 503, 'busy')
      }

      return json({
        runId,
        outcome: result.outcome,
        markdown: result.best?.autofix?.output ?? null,
        message: outcomeMessage(result.outcome, result.best),
        attempts: result.attempts.length,
      })
    } catch (err) {
      if (err instanceof PublicError) return json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status)
      console.error('generate-site:', err)
      return json({ error: 'Не удалось составить сайт. Попробуйте позже' }, 500)
    }
  }
}
