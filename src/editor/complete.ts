// Автодополнение значений полей по схеме DSL: theme, business, currency, icon, contacts и contacts.primary.
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { BUSINESSES, CONTACTS, FRONTMATTER_ALIASES, PRIMARY_TARGETS, THEMES } from '../dsl/schema/frontmatter'
import { ICONS } from '../dsl/schema/icons'
import { stateAfterLines } from './language'

export interface ValueOption {
  label: string
  /** Пояснение справа от варианта */
  detail?: string
  /** Что вставить, если отличается от label */
  apply?: string
}

export interface ValueCompletion {
  /** Начало заменяемого слова */
  from: number
  options: ValueOption[]
}

const fromRecord = (record: Record<string, string>): ValueOption[] =>
  Object.entries(record).map(([label, detail]) => ({ label, detail }))

/** Значения полей шапки верхнего уровня. Ключи — как в схеме (русские синонимы приводятся к ним). */
const TOP_LEVEL_VALUES: Record<string, ValueOption[]> = {
  theme: [...fromRecord(THEMES), { label: 'auto', detail: 'подобрать автоматически' }],
  business: fromRecord(BUSINESSES),
  currency: [{ label: 'RUB', detail: 'рубли' }],
}

const ICON_OPTIONS = fromRecord(ICONS)

/** Строка «ключ: значение» до курсора: отступ, ключ, начатое значение. */
const KEY_VALUE = /^(\s*)(?:-\s+)?([A-Za-zА-Яа-яЁё][\wА-Яа-яЁё-]*)\s*:[ \t]*(\S*)$/
/** Начатый ключ с отступом (внутри contacts:) */
const INDENTED_KEY = /^(\s+)([A-Za-z]*)$/
/** Ключ верхнего уровня шапки */
const TOP_KEY = /^([A-Za-zА-Яа-яЁё][\wА-Яа-яЁё-]*)\s*:/

const canonical = (key: string) => FRONTMATTER_ALIASES[key.toLowerCase()] ?? key

/** Ближайший сверху ключ шапки без отступа — родитель для вложенных строк (contacts:, links:). */
function parentKey(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.trim() === '' || /^\s/.test(line)) continue
    const match = line.match(TOP_KEY)
    return match ? canonical(match[1]) : null
  }
  return null
}

/** Уже заполненные ключи внутри contacts: (вниз и вверх от текущей строки). */
function filledContacts(allLines: string[], lineIndex: number): Set<string> {
  const keys = new Set<string>()
  const collect = (line: string) => {
    const match = line.match(/^\s+([A-Za-z][\w-]*)\s*:\s*\S/)
    if (match) keys.add(match[1])
    return /^\s/.test(line) || line.trim() === ''
  }
  for (let i = lineIndex - 1; i >= 0 && collect(allLines[i]); i--);
  for (let i = lineIndex + 1; i < allLines.length && allLines[i] !== '---' && collect(allLines[i]); i++);
  return keys
}

/** Что предложить в позиции `pos` текста `text`; null — подсказывать нечего. */
export function valueCompletions(text: string, pos: number): ValueCompletion | null {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const before = text.slice(lineStart, pos)
  const allLines = text.split('\n')
  const lineIndex = text.slice(0, lineStart).split('\n').length - 1
  const state = stateAfterLines(allLines.slice(0, lineIndex))
  // Строка закрывает шапку или блок — подсказывать нечего
  if (state.zone === 'start') return null

  const keyValue = before.match(KEY_VALUE)
  if (keyValue) {
    const [, indent, rawKey, word] = keyValue
    const key = canonical(rawKey)
    const from = pos - word.length

    if (state.zone === 'frontmatter') {
      if (indent === '' && TOP_LEVEL_VALUES[key]) return { from, options: TOP_LEVEL_VALUES[key] }
      if (key === 'icon') return { from, options: ICON_OPTIONS }
      if (indent !== '' && key === 'primary' && parentKey(allLines.slice(0, lineIndex)) === 'contacts') {
        // Сначала заполненные контакты: главная кнопка должна вести туда, где есть данные
        const filled = filledContacts(allLines, lineIndex)
        const options = PRIMARY_TARGETS.map((label) => ({
          label,
          detail: label === 'phone' ? 'звонок по телефону из шапки' : filled.has(label) ? 'указан' : 'не указан',
        }))
        return { from, options: options.sort((a, b) => Number(b.detail !== 'не указан') - Number(a.detail !== 'не указан')) }
      }
      return null
    }

    if (state.block === 'cards' && key === 'icon') return { from, options: ICON_OPTIONS }
    return null
  }

  // Новая строка внутри contacts: — способы связи, которых ещё нет
  const indentedKey = before.match(INDENTED_KEY)
  if (indentedKey && state.zone === 'frontmatter' && parentKey(allLines.slice(0, lineIndex)) === 'contacts') {
    const filled = filledContacts(allLines, lineIndex)
    const options = [...fromRecord(CONTACTS), { label: 'primary', detail: 'куда ведёт главная кнопка' }]
      .filter((option) => !filled.has(option.label))
      .map((option) => ({ ...option, apply: `${option.label}: ` }))
    return { from: pos - indentedKey[2].length, options }
  }

  return null
}

function completionSource(context: CompletionContext): CompletionResult | null {
  const result = valueCompletions(context.state.doc.toString(), context.pos)
  if (!result) return null
  return {
    from: result.from,
    // boost сохраняет наш порядок (как в схеме, указанные контакты — первыми): иначе CodeMirror сортирует по алфавиту
    options: result.options.map((option, index) => ({ ...option, type: 'enum', boost: -index })),
    validFor: /^[\w-]*$/,
  }
}

export function dslAutocomplete(): Extension {
  return autocompletion({ override: [completionSource], icons: false })
}
