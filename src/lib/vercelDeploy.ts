// src/lib/vercelDeploy.ts
// Публикация идёт через Edge Function deploy-vercel: токен Vercel хранится
// в секретах Supabase и в браузер не попадает.
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface DeployResult {
  url: string | null
  error: Error | null
}

/** Достаёт понятный текст ошибки из ответа функции. */
async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null)
    if (typeof body?.error === 'string') return body.error
  }
  return 'Не удалось связаться с сервером публикации. Проверьте интернет и попробуйте ещё раз'
}

export async function deployToVercel(
  html: string,
  siteId: string
): Promise<DeployResult> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('deploy-vercel', {
    body: { siteId, html },
  })

  if (error || !data?.url) {
    console.error('Vercel deployment error:', error)
    return { url: null, error: new Error(await errorMessage(error)) }
  }

  const finalUrl = data.url

  // Сохраняем локально
  const sites: { id: string }[] = JSON.parse(localStorage.getItem('md-card-sites') || '[]')
  const updatedSites = sites.map((site) =>
    site.id === siteId ? { ...site, public_url: finalUrl } : site
  )
  localStorage.setItem('md-card-sites', JSON.stringify(updatedSites))

  return { url: finalUrl, error: null }
}
