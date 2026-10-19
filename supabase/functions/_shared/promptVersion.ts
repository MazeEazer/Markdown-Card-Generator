// Версия системного промпта для журнала: первые 12 знаков SHA-256 его текста (UTF-8).
// Промпт строится из схемы, поэтому версия меняется сама, когда меняется схема или правила — без ручных номеров.

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function promptVersion(systemPrompt: string): Promise<string> {
  return (await sha256Hex(systemPrompt)).slice(0, 12)
}
