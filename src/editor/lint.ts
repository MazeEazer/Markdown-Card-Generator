// Линтер редактора: диагностики валидатора DSL (этап 2) → подчёркивания CodeMirror с кнопками автоисправления.
import { type Diagnostic as EditorDiagnostic, linter, lintGutter } from '@codemirror/lint'
import { Annotation, type Extension, type Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { fixChange } from '../dsl/fix'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'

/** Метка правки «нажата кнопка исправления»: какое правило и где — в подсказке или в панели «Проблемы». */
export const fixApplied = Annotation.define<{ code: string; source: 'tooltip' | 'panel' }>()

/**
 * Переводит диагностики валидатора в формат CodeMirror. Форматы почти совпадают (from/to/severity/message);
 * диапазон прижимается к длине документа, чтобы устаревшая позиция не сломала редактор.
 * Автоисправление (`fix`) становится кнопкой в подсказке.
 */
export function toEditorDiagnostics(diagnostics: Diagnostic[], doc: Text): EditorDiagnostic[] {
  return diagnostics.map((d) => {
    const from = Math.min(Math.max(d.from, 0), doc.length)
    const to = Math.min(Math.max(d.to, from), doc.length)
    const result: EditorDiagnostic = { from, to, severity: d.severity, message: d.message }
    if (d.fix) {
      result.actions = [{ name: d.fix.label, apply: (view, currentFrom) => applyFixInView(view, d, view.state.doc !== doc, currentFrom) }]
    }
    return result
  })
}

/**
 * Применяет исправление. Если текст успели изменить после проверки (`stale`), позиции исправления устарели —
 * тогда проверяем текст заново и берём ту же проблему на её новом месте `currentFrom`.
 */
export function applyFixInView(
  view: EditorView,
  diagnostic: Diagnostic,
  stale: boolean,
  currentFrom: number,
  source: 'tooltip' | 'panel' = 'tooltip',
): void {
  let target: Diagnostic | undefined = diagnostic
  if (stale) {
    target = validate(view.state.doc.toString()).find(
      (d) => d.code === diagnostic.code && d.from === currentFrom && d.fix,
    )
  }
  const change = target && fixChange(target)
  if (!change) return
  view.dispatch({ changes: change, userEvent: 'input.fix', annotations: fixApplied.of({ code: diagnostic.code, source }) })
}

/** Проверка текста после паузы в наборе + значки у номеров строк. */
export function dslLinter(): Extension[] {
  return [
    linter((view) => toEditorDiagnostics(validate(view.state.doc.toString()), view.state.doc), { delay: 300 }),
    lintGutter(),
  ]
}
