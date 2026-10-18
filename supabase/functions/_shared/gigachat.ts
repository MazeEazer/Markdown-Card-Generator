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

const tokenCache = new Map<TlsMode, { token: string; expiresAt: number }>()

export async function getToken(mode: TlsMode = defaultMode()): Promise<string> {
  const cached = tokenCache.get(mode)
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const key = Deno.env.get('GIGACHAT_AUTH_KEY')
  if (!key) throw new Error('Секрет GIGACHAT_AUTH_KEY не задан')

  const res = await makeFetch(mode)(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${key}`,
      RqUID: crypto.randomUUID(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `scope=${Deno.env.get('GIGACHAT_SCOPE') ?? 'GIGACHAT_API_PERS'}`,
  })
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const data = await res.json()
  tokenCache.set(mode, { token: data.access_token, expiresAt: data.expires_at })
  return data.access_token
}

export interface ChatResult {
  text: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model?: string
}

export async function callGigaChat(
  system: string,
  user: string,
  opts: { model?: string; temperature?: number; mode?: TlsMode } = {},
): Promise<ChatResult> {
  const mode = opts.mode ?? defaultMode()
  const res = await makeFetch(mode)(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken(mode)}`,
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
    }),
  })
  if (!res.ok) throw new Error(`Chat ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const data = await res.json()
  return { text: data.choices?.[0]?.message?.content ?? '', usage: data.usage, model: data.model }
}
