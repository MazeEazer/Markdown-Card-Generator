// Данные для панели «Проблемы»: счётчик по важности и строки списка.
import { offsetToLineCol } from '../dsl/position'
import type { Diagnostic, Severity } from '../dsl/types'

/** Форма слова для числа: plural(3, ['ошибка', 'ошибки', 'ошибок']) → «ошибки». */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const WORDS: Record<Severity, [string, string, string]> = {
  error: ['ошибка', 'ошибки', 'ошибок'],
  warning: ['предупреждение', 'предупреждения', 'предупреждений'],
  info: ['подсказка', 'подсказки', 'подсказок'],
}

export function countBySeverity(diagnostics: Diagnostic[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 }
  for (const d of diagnostics) counts[d.severity]++
  return counts
}

/** «2 ошибки · 1 предупреждение»; без проблем — «Проблем нет». */
export function problemsSummary(diagnostics: Diagnostic[]): string {
  const counts = countBySeverity(diagnostics)
  const parts = (['error', 'warning', 'info'] as const)
    .filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${plural(counts[severity], WORDS[severity])}`)
  return parts.length > 0 ? parts.join(' · ') : 'Проблем нет'
}

export interface ProblemRow {
  diagnostic: Diagnostic
  /** Номер строки с 1, как у редактора */
  line: number
}

/** Строки списка: в порядке текста (валидатор уже сортирует), с номером строки. */
export function problemRows(text: string, diagnostics: Diagnostic[]): ProblemRow[] {
  return diagnostics.map((diagnostic) => ({ diagnostic, line: offsetToLineCol(text, diagnostic.from).line }))
}
