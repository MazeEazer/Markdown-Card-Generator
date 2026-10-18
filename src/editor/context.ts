// Где в документе стоит курсор: шапка или тело, какой блок открыт, под каким ключом шапки строка.
// Общее для автодополнения и справки при наведении.
import type { z } from 'zod'
import { unwrap } from '../dsl/rules/helpers'
import { FRONTMATTER_ALIASES } from '../dsl/schema/frontmatter'
import { type DslState, stateAfterLines } from './language'

/** Ключ верхнего уровня шапки (допускаются русские синонимы: «тема:») */
export const TOP_KEY = /^([A-Za-zА-Яа-яЁё][\wА-Яа-яЁё-]*)\s*:/

/** Русский синоним ключа шапки → ключ схемы */
export const canonical = (key: string) => FRONTMATTER_ALIASES[key.toLowerCase()] ?? key

/** Ближайший сверху ключ шапки без отступа — родитель для вложенных строк (contacts:, links:). */
export function parentKey(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.trim() === '' || /^\s/.test(line)) continue
    const match = line.match(TOP_KEY)
    return match ? canonical(match[1]) : null
  }
  return null
}

export interface FieldMeta {
  description?: string
  examples?: unknown[]
  deprecated?: boolean
}

export const fieldMeta = (schema: z.ZodType) => (unwrap(schema).meta() ?? {}) as FieldMeta

export interface LineContext {
  lineStart: number
  /** Текст строки до курсора */
  before: string
  allLines: string[]
  lineIndex: number
  /** Состояние разбора перед строкой */
  state: DslState
  /** Шапка или тело; первая строка без `---` — тело */
  zone: 'frontmatter' | 'body'
}

export function lineContext(text: string, pos: number): LineContext {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const allLines = text.split('\n')
  const lineIndex = text.slice(0, lineStart).split('\n').length - 1
  const state = stateAfterLines(allLines.slice(0, lineIndex))
  return {
    lineStart,
    before: text.slice(lineStart, pos),
    allLines,
    lineIndex,
    state,
    zone: state.zone === 'frontmatter' ? 'frontmatter' : 'body',
  }
}
