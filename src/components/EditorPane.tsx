import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { applyFixInView } from '../editor/lint'
import { baseExtensions } from '../editor/setup'
import { ProblemsPanel } from './ProblemsPanel'

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
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

  const jumpTo = useCallback((diagnostic: Diagnostic) => {
    const view = viewRef.current
    if (!view) return
    const anchor = Math.min(diagnostic.from, view.state.doc.length)
    view.dispatch({ selection: { anchor }, scrollIntoView: true })
    view.focus()
  }, [])

  const fix = useCallback(
    (diagnostic: Diagnostic) => {
      const view = viewRef.current
      if (!view) return
      applyFixInView(view, diagnostic, view.state.doc.toString() !== checkedText, diagnostic.from)
      view.focus()
    },
    [checkedText],
  )

  return (
    <div className="h-full flex flex-col min-h-0 bg-zinc-950">
      <div className="shrink-0 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono">
        markdown
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
      <ProblemsPanel text={checkedText} diagnostics={diagnostics} onJump={jumpTo} onFix={fix} />
    </div>
  )
}
