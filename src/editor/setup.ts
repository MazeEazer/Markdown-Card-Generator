// Базовая настройка CodeMirror 6 для редактора DSL. Подсветка, линтер и подсказки добавляются следующими шагами.
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'

/** Тёмная тема в цветах интерфейса (zinc из Tailwind), как у прежнего редактора. */
const darkTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      color: '#e4e4e7',
      backgroundColor: '#09090b',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '16px 0', caretColor: '#e4e4e7' },
    '.cm-line': { padding: '0 16px 0 8px' },
    '.cm-gutters': {
      backgroundColor: '#09090b',
      color: '#52525b',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: '#18181b' },
    '.cm-activeLineGutter': { backgroundColor: '#18181b', color: '#a1a1aa' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#e4e4e7' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#3730a3 !important',
    },
    '.cm-placeholder': { color: '#52525b' },
  },
  { dark: true },
)

export function baseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    EditorView.lineWrapping,
    placeholder('Введите Markdown...'),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    darkTheme,
  ]
}
