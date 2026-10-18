// Линтер редактора: диагностики валидатора DSL (этап 2) → подчёркивания CodeMirror.
import { type Diagnostic as EditorDiagnostic, linter, lintGutter } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'

/**
 * Переводит диагностики валидатора в формат CodeMirror. Форматы почти совпадают (from/to/severity/message);
 * диапазон прижимается к длине документа, чтобы устаревшая позиция не сломала редактор.
 */
export function toEditorDiagnostics(diagnostics: Diagnostic[], docLength: number): EditorDiagnostic[] {
  return diagnostics.map((d) => {
    const from = Math.min(Math.max(d.from, 0), docLength)
    const to = Math.min(Math.max(d.to, from), docLength)
    return { from, to, severity: d.severity, message: d.message }
  })
}

/** Проверка текста после паузы в наборе + значки у номеров строк. */
export function dslLinter(): Extension[] {
  return [
    linter((view) => toEditorDiagnostics(validate(view.state.doc.toString()), view.state.doc.length), {
      delay: 300,
    }),
    lintGutter(),
  ]
}
