// Автодополнение по схеме DSL: блоки после `:::` (с заготовкой), поля шапки и элементов блока,
// значения полей (theme, business, currency, icon, contacts и contacts.primary).
import { autocompletion, type CompletionContext, type CompletionResult, snippet } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import type { z } from 'zod'
import { unwrap } from '../dsl/rules/helpers'
import { BLOCK_NAMES, BLOCKS, type BlockName } from '../dsl/schema/blocks'
import { BUSINESSES, CONTACTS, FRONTMATTER_ALIASES, frontmatterSchema, PRIMARY_TARGETS, THEMES } from '../dsl/schema/frontmatter'
import { ICONS } from '../dsl/schema/icons'
import { stateAfterLines } from './language'

export interface ValueOption {
  label: string
  /** Пояснение справа от варианта */
  detail?: string
  /** Подробное описание сбоку от списка */
  info?: string
  /** Что вставить, если отличается от label */
  apply?: string
  /** Заготовка с полями для Tab (синтаксис сниппетов CodeMirror) — вместо apply */
  snippet?: string
}

export interface ValueCompletion {
  /** Начало заменяемого текста */
  from: number
  options: ValueOption[]
  /** Пока набранное подходит под это выражение, список фильтруется без нового запроса */
  validFor?: RegExp
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

interface FieldMeta {
  description?: string
  examples?: unknown[]
  deprecated?: boolean
}

const fieldMeta = (schema: z.ZodType) => (unwrap(schema).meta() ?? {}) as FieldMeta

/** Поля объекта схемы, кроме устаревших и уже заполненных. Вставляется «ключ: ». */
function fieldOptions(schema: z.ZodObject, filled: Set<string>, applyFor: (key: string) => string): ValueOption[] {
  return Object.entries(schema.shape as Record<string, z.ZodType>)
    .filter(([key, field]) => !fieldMeta(field).deprecated && !filled.has(key))
    .map(([key, field]) => ({
      label: key,
      detail: unwrap(field) === field ? 'обязательное' : undefined,
      info: fieldMeta(field).description,
      apply: applyFor(key),
    }))
}

/** Вложенные поля шапки сразу открывают следующую строку с отступом. */
const frontmatterApply = (key: string) =>
  key === 'contacts' ? 'contacts:\n  ' : key === 'links' ? 'links:\n  - label: ' : `${key}: `

/** Ключи шапки верхнего уровня, уже записанные между `---`. */
function filledFrontmatter(allLines: string[]): Set<string> {
  const keys = new Set<string>()
  for (let i = 1; i < allLines.length && allLines[i] !== '---'; i++) {
    const match = allLines[i].match(TOP_KEY)
    if (match) keys.add(canonical(match[1]))
  }
  return keys
}

/** Ключи текущего элемента блока: строки до пустой строки или границы блока, вверх и вниз. */
function filledItem(allLines: string[], lineIndex: number): Set<string> {
  const keys = new Set<string>()
  const collect = (line: string) => {
    if (line.trim() === '' || line.startsWith(':::')) return false
    const match = line.match(/^([A-Za-z][\w-]*)\s*:/)
    if (match) keys.add(match[1])
    return true
  }
  for (let i = lineIndex - 1; i >= 0 && collect(allLines[i]); i--);
  for (let i = lineIndex + 1; i < allLines.length && collect(allLines[i]); i++);
  return keys
}

/** Фигурные скобки в сниппете — служебные; в примерах их нет, но на всякий случай убираем. */
const plain = (value: string) => value.replace(/[{}]/g, '')

/**
 * Заготовка блока из его примера в схеме: строка открытия, первый элемент, закрывающее `:::`.
 * Значения примера становятся полями — Tab переходит к следующему, набор заменяет пример.
 * `${0}` после закрывающего `:::` — куда встанет курсор после последнего поля: иначе Tab там сделал бы отступ.
 */
export function blockSnippet(name: BlockName): string {
  const lines = BLOCKS[name].example.split('\n')
  let field = 0
  const placeholder = (value: string) => `\${${++field}:${plain(value)}}`
  const open = lines[0].replace(/="([^"]*)"/g, (_, value: string) => `="${placeholder(value)}"`)
  const body = lines.slice(1, -1)
  const firstItem = body.includes('') ? body.slice(0, body.indexOf('')) : body
  const fields = firstItem.map((line) => {
    const match = line.match(/^([^:]+):\s?(.*)$/)
    return match ? `${match[1]}: ${placeholder(match[2])}` : placeholder(line)
  })
  return [open, ...fields, ':::${0}'].join('\n')
}

const BLOCK_OPTIONS: ValueOption[] = BLOCK_NAMES.map((name) => ({
  label: `:::${name}`,
  detail: BLOCKS[name].label,
  info: BLOCKS[name].description,
  snippet: blockSnippet(name),
}))

/** Начало блока: `:::` и, возможно, начатое имя. */
const FENCE_START = /^:::\s*[\w-]*$/
/** Начатый ключ в начале строки без отступа */
const LINE_START_KEY = /^([A-Za-z][\w-]*)?$/

/** Что предложить в позиции `pos` текста `text`; null — подсказывать нечего. */
export function completionsAt(text: string, pos: number): ValueCompletion | null {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const before = text.slice(lineStart, pos)
  const allLines = text.split('\n')
  const lineIndex = text.slice(0, lineStart).split('\n').length - 1
  const state = stateAfterLines(allLines.slice(0, lineIndex))
  // Первая строка документа: шапка (`---`) или сразу тело
  const zone = state.zone === 'start' ? 'body' : state.zone

  if (zone === 'body' && state.block === null && FENCE_START.test(before)) {
    return { from: lineStart, options: BLOCK_OPTIONS, validFor: FENCE_START }
  }

  const lineKey = before.match(LINE_START_KEY)
  if (lineKey) {
    const from = pos - (lineKey[1]?.length ?? 0)
    if (zone === 'frontmatter') {
      return { from, options: fieldOptions(frontmatterSchema, filledFrontmatter(allLines), frontmatterApply) }
    }
    const block = state.block && state.block in BLOCKS ? BLOCKS[state.block as BlockName] : null
    if (block?.item) {
      return { from, options: fieldOptions(block.item, filledItem(allLines, lineIndex), (key) => `${key}: `) }
    }
  }

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
  const result = completionsAt(context.state.doc.toString(), context.pos)
  if (!result) return null
  return {
    from: result.from,
    // boost сохраняет наш порядок (как в схеме, указанные контакты — первыми): иначе CodeMirror сортирует по алфавиту
    options: result.options.map(({ snippet: template, ...option }, index) => ({
      ...option,
      apply: template ? snippet(template) : option.apply,
      boost: -index,
    })),
    validFor: result.validFor ?? /^[\w-]*$/,
  }
}

export function dslAutocomplete(): Extension {
  return autocompletion({ override: [completionSource], icons: false })
}
