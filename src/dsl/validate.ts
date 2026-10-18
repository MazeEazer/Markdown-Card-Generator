// Валидатор: текст → список диагностик с позициями. Каждое правило — отдельный файл в rules/.
import type { DocumentNode } from './ast.ts'
import { parseDocument } from './parser.ts'
import { accentRule } from './rules/accent.ts'
import { frontmatterSyntaxRule } from './rules/frontmatterSyntax.ts'
import { headingsRule } from './rules/headings.ts'
import { invalidValueRule } from './rules/invalidValue.ts'
import { missingRequiredRule } from './rules/missingRequired.ts'
import { strayTextRule } from './rules/strayText.ts'
import { unclosedFenceRule } from './rules/unclosedFence.ts'
import { unknownBlockRule } from './rules/unknownBlock.ts'
import { unknownFieldRule } from './rules/unknownField.ts'
import type { Diagnostic, Severity } from './types.ts'

export interface RuleContext {
  text: string
  ast: DocumentNode
}

/** Правило валидации: смотрит на документ и возвращает найденные проблемы. */
export type Rule = (context: RuleContext) => Diagnostic[]

export const RULES: Rule[] = [
  frontmatterSyntaxRule,
  missingRequiredRule,
  unknownFieldRule,
  invalidValueRule,
  accentRule,
  unclosedFenceRule,
  unknownBlockRule,
  strayTextRule,
  headingsRule,
]

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

/** Проверяет уже разобранный документ. Диагностики отсортированы по позиции, затем по важности. */
export function validateDocument(ast: DocumentNode): Diagnostic[] {
  const context = { text: ast.text, ast }
  return RULES.flatMap((rule) => rule(context)).sort(
    (a, b) => a.from - b.from || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
}

export function validate(text: string): Diagnostic[] {
  return validateDocument(parseDocument(text))
}
