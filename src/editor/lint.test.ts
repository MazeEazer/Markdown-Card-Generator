import { EditorState, Text, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { applyFixInView, fixApplied, toEditorDiagnostics } from './lint'

const diagnostic = (patch: Partial<Diagnostic>): Diagnostic => ({
  from: 0,
  to: 1,
  severity: 'error',
  code: 'test',
  message: 'Сообщение',
  ...patch,
})

const docOfLength = (length: number) => Text.of(['x'.repeat(length)])

/** Минимальная замена EditorView для кнопок исправления: состояние + dispatch. */
function fakeView(text: string) {
  const view = {
    state: EditorState.create({ doc: text }),
    dispatch(spec: TransactionSpec) {
      view.state = view.state.update(spec).state
    },
  }
  return view
}

/** Проверяет текст и нажимает кнопку исправления у проблемы с кодом `code`. */
function clickFix(view: ReturnType<typeof fakeView>, code: string, linted = view.state.doc) {
  const diagnostics = validate(linted.toString())
  const index = diagnostics.findIndex((d) => d.code === code)
  const editorDiagnostic = toEditorDiagnostics(diagnostics, linted)[index]
  const action = editorDiagnostic.actions![0]
  return { action, apply: (from = editorDiagnostic.from) => action.apply(view as unknown as EditorView, from, editorDiagnostic.to) }
}

describe('toEditorDiagnostics', () => {
  it('переносит позицию, важность и сообщение без изменений', () => {
    const result = toEditorDiagnostics(
      [diagnostic({ from: 3, to: 8, severity: 'warning', message: 'Нет телефона' })],
      docOfLength(20),
    )
    expect(result).toEqual([{ from: 3, to: 8, severity: 'warning', message: 'Нет телефона' }])
  })

  it('прижимает диапазон к длине документа', () => {
    expect(toEditorDiagnostics([diagnostic({ from: 15, to: 30 })], docOfLength(10))).toEqual([
      expect.objectContaining({ from: 10, to: 10 }),
    ])
    expect(toEditorDiagnostics([diagnostic({ from: -2, to: 4 })], docOfLength(10))).toEqual([
      expect.objectContaining({ from: 0, to: 4 }),
    ])
  })

  it('конец диапазона не раньше начала', () => {
    expect(toEditorDiagnostics([diagnostic({ from: 5, to: 2 })], docOfLength(10))).toEqual([
      expect.objectContaining({ from: 5, to: 5 }),
    ])
  })

  it('подчёркивает именно тот текст, на который указал валидатор', () => {
    const text = '---\nname: Барбершоп\nphone: 12345\nfoo: 1\n---\n'
    const marked = toEditorDiagnostics(validate(text), Text.of(text.split('\n'))).map((d) => [
      d.severity,
      text.slice(d.from, d.to),
    ])
    expect(marked).toEqual([
      ['warning', '12345'],
      ['warning', 'foo'],
    ])
  })

  it('без автоисправления кнопок нет', () => {
    expect(toEditorDiagnostics([diagnostic({})], docOfLength(5))[0].actions).toBeUndefined()
  })
})

describe('кнопка автоисправления', () => {
  it('подпись кнопки — подпись исправления из валидатора', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +79991234567\n---\n')
    expect(clickFix(view, 'phone-format').action.name).toBe('Заменить на +7 999 123-45-67')
  })

  it('заменяет подчёркнутый текст, и проблема пропадает', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +79991234567\n---\n')
    clickFix(view, 'phone-format').apply()
    expect(view.state.doc.toString()).toBe('---\nname: Барбершоп\nphone: +7 999 123-45-67\n---\n')
    expect(validate(view.state.doc.toString()).map((d) => d.code)).not.toContain('phone-format')
  })

  it('исправление со своим диапазоном: закрывает блок строкой ::: ниже', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +7 999 123-45-67\n---\n\n:::hours\nПн–Пт: 10:00–20:00\n')
    clickFix(view, 'unclosed-fence').apply()
    expect(view.state.doc.toString()).toMatch(/:::hours\nПн–Пт: 10:00–20:00\n:::/)
    expect(validate(view.state.doc.toString()).map((d) => d.code)).not.toContain('unclosed-fence')
  })

  it('текст изменили после проверки — исправление применяется к проблеме на новом месте', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +79991234567\n---\n')
    const linted = view.state.doc
    const fix = clickFix(view, 'phone-format', linted)
    // Пользователь дописал текст выше — номер сдвинулся на 4 символа
    view.dispatch({ changes: { from: 10, insert: 'Наш ' } })
    const from = view.state.doc.toString().indexOf('+7999')
    fix.apply(from)
    expect(view.state.doc.toString()).toBe('---\nname: Наш Барбершоп\nphone: +7 999 123-45-67\n---\n')
  })

  it('проблему уже исправили вручную — кнопка ничего не ломает', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +79991234567\n---\n')
    const fix = clickFix(view, 'phone-format')
    view.dispatch({ changes: { from: 27, to: 39, insert: '+7 999 123-45-67' } })
    const before = view.state.doc.toString()
    fix.apply(27)
    expect(view.state.doc.toString()).toBe(before)
  })
})

describe('метка исправления для журнала событий', () => {
  it('правка помечена кодом правила и местом нажатия', () => {
    const view = fakeView('---\nname: Барбершоп\nphone: +79991234567\n---\n')
    const marks: unknown[] = []
    const dispatch = view.dispatch
    view.dispatch = (spec) => {
      marks.push(view.state.update(spec).annotation(fixApplied))
      dispatch(spec)
    }
    const diagnostic = validate(view.state.doc.toString()).find((d) => d.code === 'phone-format')!
    applyFixInView(view as unknown as EditorView, diagnostic, false, diagnostic.from, 'panel')
    expect(marks).toEqual([{ code: 'phone-format', source: 'panel' }])
  })
})
