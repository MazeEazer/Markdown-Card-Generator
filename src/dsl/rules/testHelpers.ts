// Помощники для тестов правил (только для *.test.ts).
import { expect } from 'vitest'
import { applyFix } from '../fix.ts'
import type { Diagnostic } from '../types.ts'
import { validate } from '../validate.ts'

/** Диагностики с данным кодом. */
export function findAll(text: string, code: string): Diagnostic[] {
  return validate(text).filter((d) => d.code === code)
}

/** Ровно одна диагностика с данным кодом. */
export function findOne(text: string, code: string): Diagnostic {
  const found = findAll(text, code)
  expect(found, `ожидалась одна диагностика ${code}`).toHaveLength(1)
  return found[0]
}

/** Подчёркнутый текст. */
export function underlined(text: string, diagnostic: Diagnostic): string {
  return text.slice(diagnostic.from, diagnostic.to)
}

/** Применяет fix и проверяет, что проблема с этим кодом исчезла. Возвращает исправленный текст. */
export function fixAndRecheck(text: string, diagnostic: Diagnostic): string {
  expect(diagnostic.fix, 'ожидалось автоисправление').toBeDefined()
  const fixed = applyFix(text, diagnostic)
  expect(findAll(fixed, diagnostic.code)).toEqual([])
  return fixed
}

/** Карточка с шапкой (name добавляется) и телом. */
export function doc(frontmatter: string, body = ''): string {
  return `---\nname: Тест\n${frontmatter}\n---\n${body}`
}
