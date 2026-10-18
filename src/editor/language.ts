// Подсветка синтаксиса DSL: построчный разбор (StreamLanguage) по тем же правилам, что и парсер в src/dsl/.
import { HighlightStyle, StreamLanguage, type StreamParser, StringStream, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'
import { FENCE_CLOSE, FENCE_OPEN } from '../dsl/sections'

export interface DslState {
  /** Где мы: до текста, во frontmatter (`---` … `---`) или в теле */
  zone: 'start' | 'frontmatter' | 'body'
  /** Имя открытого блока `:::name`, null — вне блока */
  block: string | null
  /** Что ждём дальше в текущей строке */
  next: 'blockName' | 'blockArgs' | 'colon' | 'value' | null
}

/** Разделитель frontmatter — строго `---`, как FRONTMATTER в src/dsl/parser.ts (`\r` остаётся от CRLF) */
const DELIMITER = /^---\r?$/
const HEADING = /^##(?:\s.*)?$/
/** Ключ поля: латиница перед двоеточием — как FIELD_LINE в src/dsl/sections.ts; во frontmatter допускается отступ */
const KEY = /^\s*[A-Za-z][\w-]*(?=\s*:)/
const NUMBER = /^\d[\d\s]*$/
const QUOTED = /^(["']).*\1\s*$/

/** Значение поля: число, строка в кавычках или обычный текст до конца строки. */
function value(stream: Parameters<StreamParser<DslState>['token']>[0]): string | null {
  if (stream.match(NUMBER)) return 'number'
  if (stream.match(QUOTED)) return 'string'
  stream.skipToEnd()
  return null
}

export const dslStreamParser: StreamParser<DslState> = {
  name: 'md-card-dsl',
  startState: () => ({ zone: 'start', block: null, next: null }),
  copyState: (state) => ({ ...state }),
  // Пустая первая строка — шапки уже не будет: парсер ищет `---` с самого начала текста
  blankLine: (state) => {
    if (state.zone === 'start') state.zone = 'body'
  },

  token(stream, state) {
    if (stream.sol()) {
      state.next = null
      // Первая строка `---` открывает frontmatter, любая другая — сразу тело
      if (state.zone === 'start') {
        state.zone = 'body'
        if (stream.match(DELIMITER)) {
          state.zone = 'frontmatter'
          return 'meta'
        }
      }
      if (state.zone === 'frontmatter') {
        if (stream.match(DELIMITER)) {
          state.zone = 'body'
          return 'meta'
        }
        if (stream.match(/^\s*#.*/)) return 'comment'
        if (stream.match(KEY)) {
          state.next = 'colon'
          return 'propertyName'
        }
        stream.skipToEnd()
        return null
      }

      // Тело документа
      const line = stream.string
      if (FENCE_CLOSE.test(line) && state.block !== null) {
        stream.skipToEnd()
        state.block = null
        return 'meta'
      }
      const fence = line.match(FENCE_OPEN)
      if (fence && state.block === null) {
        stream.match(':::')
        state.block = fence[1]
        state.next = 'blockName'
        return 'meta'
      }
      if (state.block === null && stream.match(HEADING)) return 'heading'
      // Внутри :::code — чужой код, поля не подсвечиваем
      if (state.block !== null && state.block !== 'code' && stream.match(KEY)) {
        state.next = 'colon'
        return 'propertyName'
      }
      stream.skipToEnd()
      return state.block === 'code' ? 'monospace' : null
    }

    switch (state.next) {
      case 'blockName':
        stream.eatSpace()
        stream.match(/^[A-Za-z][\w-]*/)
        state.next = 'blockArgs'
        return 'keyword'
      case 'colon':
        stream.eatSpace()
        stream.eat(':')
        state.next = 'value'
        return 'punctuation'
      case 'value':
        if (stream.eatSpace()) return null
        state.next = null
        return value(stream)
      default:
        stream.skipToEnd()
        return null
    }
  },
}

/** Состояние разбора перед строкой `lines.length` — где она: в шапке, в каком блоке. Для автодополнения. */
export function stateAfterLines(lines: string[]): DslState {
  const state = dslStreamParser.startState!(2)
  for (const line of lines) {
    if (line === '') {
      dslStreamParser.blankLine!(state, 2)
      continue
    }
    const stream = new StringStream(line, 2, 2)
    while (!stream.eol()) {
      dslStreamParser.token(stream, state)
      stream.start = stream.pos
    }
  }
  return state
}

/** Цвета на тёмном фоне редактора (палитра Tailwind). */
const dslHighlightStyle = HighlightStyle.define([
  { tag: tags.meta, color: '#71717a' },
  { tag: tags.keyword, color: '#a5b4fc', fontWeight: '600' },
  { tag: tags.propertyName, color: '#7dd3fc' },
  { tag: tags.punctuation, color: '#71717a' },
  { tag: tags.heading, color: '#fde68a', fontWeight: '600' },
  { tag: tags.string, color: '#6ee7b7' },
  { tag: tags.number, color: '#fdba74' },
  { tag: tags.comment, color: '#71717a', fontStyle: 'italic' },
  { tag: tags.monospace, color: '#d4d4d8' },
])

export function dslHighlighting(): Extension[] {
  return [StreamLanguage.define(dslStreamParser), syntaxHighlighting(dslHighlightStyle)]
}
