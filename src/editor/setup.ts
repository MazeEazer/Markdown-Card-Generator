// Настройка CodeMirror 6 для редактора DSL: базовые возможности, тема, подсветка и линтер.
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
import { dslHighlighting } from './language'
import { dslLinter } from './lint'

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
      // Без лигатур JetBrains Mono: иначе «---» во frontmatter рисуется как « --»
      fontVariantLigatures: 'none',
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
    // Подсказка с сообщением валидатора: шрифт интерфейса, а не моноширинный, и ограниченная ширина
    '.cm-tooltip': {
      backgroundColor: '#18181b',
      border: '1px solid #3f3f46',
      borderRadius: '6px',
      color: '#e4e4e7',
    },
    '.cm-tooltip-lint': { maxWidth: '420px' },
    '.cm-diagnostic': {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      lineHeight: '1.45',
      padding: '6px 10px 6px 8px',
      whiteSpace: 'normal',
    },
    // Кнопка автоисправления — в цвет основных кнопок интерфейса, отдельной строкой под сообщением
    '.cm-diagnosticAction': {
      display: 'block',
      margin: '6px 0 2px',
      padding: '3px 10px',
      borderRadius: '4px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      font: 'inherit',
      cursor: 'pointer',
    },
    '.cm-diagnosticAction:hover': { backgroundColor: '#4338ca' },
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
    dslHighlighting(),
    dslLinter(),
  ]
}
