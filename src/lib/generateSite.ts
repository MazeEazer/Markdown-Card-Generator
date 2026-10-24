// Сайт по описанию — через Edge Function generate-site (GigaChat и журнал — на сервере).
// Ожидание «в очереди» — generateQueue.ts.
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { type GenerateReply, type GenerateRequest, type GenerateResponse, type GenerateStatus, generateWithQueue } from './generateQueue'

/** Функция отвечает не позже чем через 150 с (ограничение Supabase) — ждём чуть дольше. */
const REQUEST_TIMEOUT_MS = 160_000

const NETWORK_ERROR = 'Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз'

async function invokeGenerateSite(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateReply> {
  const { data, error } = await supabase.functions.invoke<GenerateResponse>('generate-site', {
    body: request,
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  })
  if (!error && data) return { data }
  if (signal?.aborted) throw new DOMException('Генерация отменена', 'AbortError')

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null)
    if (typeof body?.error === 'string') return { error: body.error, code: body.code }
    // 504 — функция не успела ответить за 150 с
    if (error.context.status === 504) return { error: 'Нейросеть отвечала слишком долго. Попробуйте ещё раз через минуту' }
  }
  if (!(error instanceof FunctionsFetchError)) console.error('generate-site:', error)
  return { error: NETWORK_ERROR }
}

export function generateSiteFromDescription(
  request: GenerateRequest,
  options: { onStatus?: (status: GenerateStatus) => void; signal?: AbortSignal } = {},
): Promise<GenerateResponse> {
  return generateWithQueue(request, { invoke: invokeGenerateSite, ...options })
}
