import { type Ref, useCallback, useDeferredValue, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { frontmatterFieldChange } from '../dsl/frontmatterEdit'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { historyEdit } from '../editor/historyEdit'
import { insertBlock } from '../editor/insertBlock'
import { applyFixInView } from '../editor/lint'
import { baseExtensions } from '../editor/setup'
import { createEditorLogger } from '../lib/editorEvents'
import { AddBlockDialog } from './AddBlockDialog'
import { ProblemsPanel } from './ProblemsPanel'

/** Что редактор умеет по просьбе снаружи: перевести курсор к позиции (клик по превью), записать поле шапки (фото). */
export interface EditorHandle {
  jumpTo: (offset: number) => void
  /** Записать поле в шапку одной правкой (фото → avatar); false — редактора ещё нет */
  setFrontmatterField: (key: string, value: string) => boolean
}

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  ref?: Ref<EditorHandle>
  /** Открытый сайт — к нему привязываются события журнала */
  siteId: string | null
}

export function EditorPane({ value, onChange, ref, siteId }: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Журнал событий для эксперимента: один на открытый редактор; выключен — ничего не пишет
  const [logger] = useState(() => createEditorLogger(siteId))
  // Текст заменили снаружи — следующий список ошибок станет новой точкой отсчёта, а не «появившимися ошибками»
  const externalChange = useRef(false)
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
          baseExtensions(logger),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    // Уход со страницы или из редактора — отправляем накопленные события
    window.addEventListener('pagehide', logger.flush)
    return () => {
      window.removeEventListener('pagehide', logger.flush)
      logger.flush()
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
      externalChange.current = true
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      })
    }
  }, [value])

  // Панель «Проблемы»: проверка с отложенным текстом, чтобы набор не тормозил
  const checkedText = useDeferredValue(value)
  const diagnostics = useMemo(() => validate(checkedText), [checkedText])

  useEffect(() => {
    if (externalChange.current) {
      externalChange.current = false
      logger.resetDiagnostics(diagnostics)
    } else {
      logger.diagnostics(diagnostics)
    }
  }, [diagnostics, logger])

  const jumpToOffset = useCallback((offset: number) => {
    const view = viewRef.current
    if (!view) return
    const anchor = Math.min(Math.max(offset, 0), view.state.doc.length)
    // Строку ставим в середину экрана, а не к краю: так видно и её, и что вокруг
    view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) })
    view.focus()
  }, [])

  // Фото перетащили на превью: правим только строку шапки, одной транзакцией в истории — Cmd+Z отменяет её целиком
  const setFrontmatterField = useCallback((key: string, value: string) => {
    const view = viewRef.current
    if (!view) return false
    view.dispatch(historyEdit(frontmatterFieldChange(view.state.doc.toString(), key, value), `input.${key}`))
    return true
  }, [])

  useImperativeHandle(ref, () => ({ jumpTo: jumpToOffset, setFrontmatterField }), [jumpToOffset, setFrontmatterField])

  const jumpTo = useCallback((diagnostic: Diagnostic) => jumpToOffset(diagnostic.from), [jumpToOffset])

  const fix = useCallback(
    (diagnostic: Diagnostic) => {
      const view = viewRef.current
      if (!view) return
      applyFixInView(view, diagnostic, view.state.doc.toString() !== checkedText, diagnostic.from, 'panel')
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

  const insert = (markup: string, name: string) => {
    const view = viewRef.current
    if (!view || !addBlock) return
    // Пока окно было открыто, текст мог смениться (например, сохранение) — считаем место заново по текущему
    const pos = Math.min(addBlock.pos, view.state.doc.length)
    const { from, insert, blockStart } = insertBlock(view.state.doc.toString(), pos, markup)
    view.dispatch({ changes: { from, insert }, selection: { anchor: blockStart }, scrollIntoView: true, userEvent: 'input.block' })
    logger.log('block_inserted', name)
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
