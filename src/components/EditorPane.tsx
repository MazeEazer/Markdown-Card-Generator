import { type Ref, useCallback, useDeferredValue, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { insertBlock } from '../editor/insertBlock'
import { applyFixInView } from '../editor/lint'
import { baseExtensions } from '../editor/setup'
import { AddBlockDialog } from './AddBlockDialog'
import { ProblemsPanel } from './ProblemsPanel'

/** Что редактор умеет по просьбе снаружи: перевести курсор к позиции (клик по превью). */
export interface EditorHandle {
  jumpTo: (offset: number) => void
}

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  ref?: Ref<EditorHandle>
}

export function EditorPane({ value, onChange, ref }: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Слушатель CodeMirror создаётся один раз, поэтому свежий onChange берём из ref
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Редактор создаётся один раз; дальше он сам хранит текст, историю отмен и курсор
  useEffect(() => {
    const view = new EditorView({
      parent: containerRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          baseExtensions(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- начальный текст нужен только при создании
  }, [])

  // Текст сменился снаружи (открыли другой сайт, выбрали шаблон, вставили картинку) — переносим в редактор.
  // В историю не пишем: Cmd+Z не должен возвращать текст предыдущего сайта
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      })
    }
  }, [value])

  // Панель «Проблемы»: проверка с отложенным текстом, чтобы набор не тормозил
  const checkedText = useDeferredValue(value)
  const diagnostics = useMemo(() => validate(checkedText), [checkedText])

  const jumpToOffset = useCallback((offset: number) => {
    const view = viewRef.current
    if (!view) return
    const anchor = Math.min(Math.max(offset, 0), view.state.doc.length)
    // Строку ставим в середину экрана, а не к краю: так видно и её, и что вокруг
    view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) })
    view.focus()
  }, [])

  useImperativeHandle(ref, () => ({ jumpTo: jumpToOffset }), [jumpToOffset])

  const jumpTo = useCallback((diagnostic: Diagnostic) => jumpToOffset(diagnostic.from), [jumpToOffset])

  const fix = useCallback(
    (diagnostic: Diagnostic) => {
      const view = viewRef.current
      if (!view) return
      applyFixInView(view, diagnostic, view.state.doc.toString() !== checkedText, diagnostic.from)
      view.focus()
    },
    [checkedText],
  )

  // «Добавить блок»: запоминаем текст и курсор на момент открытия — форма проверяет блок на его будущем месте
  const [addBlock, setAddBlock] = useState<{ text: string; pos: number } | null>(null)

  const openAddBlock = () => {
    const view = viewRef.current
    if (!view) return
    setAddBlock({ text: view.state.doc.toString(), pos: view.state.selection.main.head })
  }

  const insert = (markup: string) => {
    const view = viewRef.current
    if (!view || !addBlock) return
    // Пока окно было открыто, текст мог смениться (например, сохранение) — считаем место заново по текущему
    const pos = Math.min(addBlock.pos, view.state.doc.length)
    const { from, insert, blockStart } = insertBlock(view.state.doc.toString(), pos, markup)
    view.dispatch({ changes: { from, insert }, selection: { anchor: blockStart }, scrollIntoView: true, userEvent: 'input.block' })
    setAddBlock(null)
    view.focus()
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-zinc-950">
      <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-zinc-800 text-xs text-zinc-500 font-mono">
        markdown
        <button
          type="button"
          onClick={openAddBlock}
          className="ml-auto px-2.5 py-1 rounded font-sans text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          + Блок
        </button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
      <ProblemsPanel text={checkedText} diagnostics={diagnostics} onJump={jumpTo} onFix={fix} />
      {addBlock && (
        <AddBlockDialog
          text={addBlock.text}
          pos={addBlock.pos}
          onInsert={insert}
          onClose={() => {
            setAddBlock(null)
            viewRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}
