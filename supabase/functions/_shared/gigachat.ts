// Клиент GigaChat API для Supabase Edge Functions (Deno).
// Секреты:
//   GIGACHAT_AUTH_KEY      — ключ авторизации из личного кабинета Studio (обязательно)
//   GIGACHAT_SCOPE         — GIGACHAT_API_PERS (по умолчанию) | GIGACHAT_API_B2B | GIGACHAT_API_CORP
//   GIGACHAT_CA_CERT_B64   — сертификаты НУЦ Минцифры (root + sub) в base64, если без них TLS не проходит

const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
export const API_URL = 'https://api.giga.chat/v1'

export type TlsMode = 'default' | 'custom-ca'

/** Разбивает PEM-бандл на отдельные сертификаты. */
function splitPem(bundle: string): string[] {
  return bundle
    .split(/(?<=-----END CERTIFICATE-----)/)
    .map((c) => c.trim())
    .filter((c) => c.startsWith('-----BEGIN CERTIFICATE-----'))
}

/** fetch с нужным режимом TLS. custom-ca бросает исключение, если среда не поддерживает Deno.createHttpClient. */
export function makeFetch(mode: TlsMode): typeof fetch {
  if (mode === 'default') return fetch

  const b64 = Deno.env.get('GIGACHAT_CA_CERT_B64')
  if (!b64) throw new Error('Секрет GIGACHAT_CA_CERT_B64 не задан')
  const caCerts = splitPem(atob(b64))
  if (!caCerts.length) throw new Error('В GIGACHAT_CA_CERT_B64 не найдено ни одного сертификата')

  // deno-lint-ignore no-explicit-any
  const client = (Deno as any).createHttpClient({ caCerts })
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    // deno-lint-ignore no-explicit-any
    fetch(input, { ...init, client } as any)) as typeof fetch
}

/** Режим TLS для рабочих функций: custom-ca, если задан сертификат, иначе обычный. */
export function defaultMode(): TlsMode {
  return Deno.env.get('GIGACHAT_CA_CERT_B64') ? 'custom-ca' : 'default'
}

/**
 * Ошибка обращения к GigaChat с причиной — по ней вызывающий код решает, дошёл ли запрос до модели:
 *   busy        — 429: у физлица один поток, модель занята другим запросом (до модели не дошли);
 *   unavailable — не получили токен, нет секрета, нет соединения (до модели не дошли);
 *   timeout     — запрос отправлен, ответа не дождались;
 *   http        — модель ответила ошибкой или ответ не разобран.
 */
export class GigaChatError extends Error {
  readonly kind: 'busy' | 'unavailable' | 'timeout' | 'http'
  readonly status?: number
  constructor(message: string, kind: GigaChatError['kind'], status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

const isAbort = (error: unknown) => error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')

const tokenCache = new Map<TlsMode, { token: string; expiresAt: number }>()

export async function getToken(mode: TlsMode = defaultMode(), signal?: AbortSignal): Promise<string> {
  const cached = tokenCache.get(mode)
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const key = Deno.env.get('GIGACHAT_AUTH_KEY')
  if (!key) throw new GigaChatError('Секрет GIGACHAT_AUTH_KEY не задан', 'unavailable')

  let res: Response
  try {
    res = await makeFetch(mode)(OAUTH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${key}`,
        RqUID: crypto.randomUUID(),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `scope=${Deno.env.get('GIGACHAT_SCOPE') ?? 'GIGACHAT_API_PERS'}`,
      signal,
    })
  } catch (error) {
    throw new GigaChatError(`OAuth: ${(error as Error).message}`, 'unavailable')
  }
  if (!res.ok) {
    throw new GigaChatError(`OAuth ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status === 429 ? 'busy' : 'unavailable', res.status)
  }

  const data = await res.json()
  tokenCache.set(mode, { token: data.access_token, expiresAt: data.expires_at })
  return data.access_token
}

export interface ChatResult {
  text: string
  /** precached_prompt_tokens — входные токены из кэша промпта, в prompt_tokens не входят */
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; precached_prompt_tokens?: number }
  model?: string
  /** stop — ответ закончен; length — обрезан по max_tokens; blacklist — сработал фильтр */
  finishReason?: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  /** Предел длины ответа (max_tokens) */
  maxTokens?: number
  /** Сколько ждать токен и ответ целиком, мс (AbortSignal.timeout) */
  timeoutMs?: number
  mode?: TlsMode
}

export async function callGigaChat(system: string, user: string, opts: ChatOptions = {}): Promise<ChatResult> {
  const mode = opts.mode ?? defaultMode()
  const signal = opts.timeoutMs === undefined ? undefined : AbortSignal.timeout(opts.timeoutMs)
  const token = await getToken(mode, signal)

  let res: Response
  try {
    res = await makeFetch(mode)(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'md-card', // без User-Agent api.giga.chat отвечает 403
      },
      body: JSON.stringify({
        model: opts.model ?? 'GigaChat-2',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts.temperature ?? 0.3,
        ...(opts.maxTokens === undefined ? {} : { max_tokens: opts.maxTokens }),
      }),
      signal,
    })
  } catch (error) {
    // Запрос ушёл, ответа не дождались — или не удалось даже соединиться
    if (isAbort(error)) throw new GigaChatError('Chat: время ожидания ответа истекло', 'timeout')
    throw new GigaChatError(`Chat: ${(error as Error).message}`, 'unavailable')
  }
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300)
    if (res.status === 401) tokenCache.delete(mode) // токен отозван раньше срока — в следующий раз получим новый
    const kind = res.status === 429 ? 'busy' : res.status === 401 ? 'unavailable' : 'http'
    throw new GigaChatError(`Chat ${res.status}: ${body}`, kind, res.status)
  }

  let data
  try {
    data = await res.json()
  } catch (error) {
    if (isAbort(error)) throw new GigaChatError('Chat: время ожидания ответа истекло', 'timeout')
    throw new GigaChatError(`Chat: ответ не разобран — ${(error as Error).message}`, 'http', res.status)
  }
  const choice = data.choices?.[0]
  return { text: choice?.message?.content ?? '', usage: data.usage, model: data.model, finishReason: choice?.finish_reason }
}
