import { history, undo } from '@codemirror/commands'
import { EditorSelection, EditorState, type Transaction, type TransactionSpec } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { frontmatterFieldChange } from '../dsl/frontmatterEdit'
import { historyEdit } from './historyEdit'

const TEXT = '---\nname: Барбершоп\nphone: +7 900 000-00-00\n---\n\n## О нас\nСтрижём.\n'
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQ'

/** Состояние без EditorView: команды CodeMirror работают с { state, dispatch }. */
function editor(doc: string, cursor: number) {
  let state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: [history()] })
  const dispatch = (tr: Transaction) => {
    state = tr.state
  }
  return { get state() { return state }, dispatch, apply: (spec: TransactionSpec) => dispatch(state.update(spec)) }
}

describe('historyEdit: фото в шапку одной транзакцией', () => {
  it('курсор в тексте раздела остаётся на том же слове', () => {
    const at = TEXT.indexOf('Стрижём')
    const view = editor(TEXT, at)
    view.apply(historyEdit(frontmatterFieldChange(TEXT, 'avatar', PHOTO), 'input.avatar'))
    expect(view.state.doc.toString()).toContain(`name: Барбершоп\navatar: ${PHOTO}\n`)
    const cursor = view.state.selection.main.head
    expect(view.state.doc.sliceString(cursor, cursor + 7)).toBe('Стрижём')
  })

  it('отменяется одним Cmd+Z и не склеивается с набором до неё', () => {
    const view = editor(TEXT, TEXT.length)
    view.apply({ changes: { from: TEXT.length, insert: 'Ещё текст.' }, userEvent: 'input.type' })
    const typed = view.state.doc.toString()
    view.apply(historyEdit(frontmatterFieldChange(typed, 'avatar', PHOTO), 'input.avatar'))
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(typed)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(TEXT)
  })

  it('замена существующего avatar — тоже один шаг отмены', () => {
    const withOld = TEXT.replace('phone:', 'avatar: https://example.ru/old.png\nphone:')
    const view = editor(withOld, 0)
    view.apply(historyEdit(frontmatterFieldChange(withOld, 'avatar', PHOTO), 'input.avatar'))
    expect(view.state.doc.toString().match(/^avatar:/gm)).toHaveLength(1)
    undo(view)
    expect(view.state.doc.toString()).toBe(withOld)
  })
})
