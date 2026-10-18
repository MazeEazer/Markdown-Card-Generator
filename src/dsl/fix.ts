import type { Diagnostic } from './types.ts'

/** Применяет автоисправление диагностики к тексту. Без fix текст не меняется. */
export function applyFix(text: string, diagnostic: Diagnostic): string {
  const { fix } = diagnostic
  if (!fix) return text
  const from = fix.from ?? diagnostic.from
  const to = fix.to ?? diagnostic.to
  return text.slice(0, from) + fix.replace + text.slice(to)
}
