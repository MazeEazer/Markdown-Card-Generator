import type { Diagnostic } from './types.ts'

/** Правка, которую делает автоисправление: заменить текст [from, to) на insert. Без fix — null. */
export function fixChange(diagnostic: Diagnostic): { from: number; to: number; insert: string } | null {
  const { fix } = diagnostic
  if (!fix) return null
  return { from: fix.from ?? diagnostic.from, to: fix.to ?? diagnostic.to, insert: fix.replace }
}

/** Применяет автоисправление диагностики к тексту. Без fix текст не меняется. */
export function applyFix(text: string, diagnostic: Diagnostic): string {
  const change = fixChange(diagnostic)
  if (!change) return text
  return text.slice(0, change.from) + change.insert + text.slice(change.to)
}
