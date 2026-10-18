// Справка при наведении: описание блока (`:::services`) или поля (`price:`) из схемы DSL.
import type { Extension } from '@codemirror/state'
import { hoverTooltip } from '@codemirror/view'
import { z } from 'zod'
import { enumOptions, unwrap } from '../dsl/rules/helpers'
import { type BlockDefinition, BLOCKS, type BlockName } from '../dsl/schema/blocks'
import { contactsSchema, frontmatterSchema } from '../dsl/schema/frontmatter'
import { FENCE_OPEN } from '../dsl/sections'
import { canonical, fieldMeta, lineContext, parentKey } from './context'

export interface HoverField {
  key: string
  required: boolean
  description: string
}

export interface HoverInfo {
  /** Диапазон слова, над которым справка */
  from: number
  to: number
  title: string
  /** Абзацы описания */
  lines: string[]
  /** Поля блока — для справки по блоку */
  fields?: HoverField[]
}

/** Ключ в строке: отступ, необязательный «- » (элемент списка), ключ до двоеточия. */
const KEY_LINE = /^(\s*)(-\s+)?([A-Za-zА-Яа-яЁё][\wА-Яа-яЁё-]*)\s*:/

const isRequired = (schema: z.ZodType) => !(schema instanceof z.ZodOptional)

/** Поля объекта схемы для справки по блоку, без устаревших. */
function describeFields(schema: z.ZodObject): HoverField[] {
  return Object.entries(schema.shape as Record<string, z.ZodType>)
    .filter(([, field]) => !fieldMeta(field).deprecated)
    .map(([key, field]) => ({ key, required: isRequired(field), description: fieldMeta(field).description ?? '' }))
}

function blockInfo(name: BlockName, from: number, to: number): HoverInfo {
  const block: BlockDefinition = BLOCKS[name]
  const lines = [block.description]
  if (block.body) lines.push(block.body)
  return {
    from,
    to,
    title: `:::${name} — ${block.label}`,
    lines,
    fields: block.item ? describeFields(block.item) : undefined,
  }
}

function fieldInfo(key: string, schema: z.ZodType, from: number, to: number): HoverInfo {
  const meta = fieldMeta(schema)
  const lines = [meta.description ?? '']
  // У тем, видов бизнеса и иконок варианты уже перечислены в описании (как в промпте, src/dsl/prompt.ts)
  const options = enumOptions(schema)
  if (options && !meta.description?.includes(options[0])) lines.push(`Значения: ${options.join(', ')}`)
  const example = meta.examples?.[0]
  if (example !== undefined && !options && !(unwrap(schema) instanceof z.ZodObject)) lines.push(`Пример: ${example}`)
  if (meta.deprecated) lines.push('Устаревшее поле — лучше не использовать.')
  return { from, to, title: `${key} — ${isRequired(schema) ? 'обязательное' : 'необязательное'} поле`, lines }
}

/** Схема поля шапки по строке: верхний уровень, внутри contacts: или в элементе links:. */
function frontmatterField(key: string, indent: string, linesAbove: string[]): z.ZodType | undefined {
  if (indent === '') return frontmatterSchema.shape[canonical(key) as keyof typeof frontmatterSchema.shape]
  const parent = parentKey(linesAbove)
  if (parent === 'contacts') return contactsSchema.shape[key as keyof typeof contactsSchema.shape]
  if (parent === 'links') {
    const links = unwrap(frontmatterSchema.shape.links) as z.ZodArray<z.ZodObject>
    return links.element.shape[key]
  }
  return undefined
}

/** Справка для позиции `pos` текста `text`; null — справки нет (обычный текст, неизвестное слово). */
export function hoverInfoAt(text: string, pos: number): HoverInfo | null {
  const { lineStart, allLines, lineIndex, state, zone } = lineContext(text, pos)
  const line = allLines[lineIndex]
  const column = pos - lineStart

  if (zone === 'body' && state.block === null) {
    const fence = line.match(FENCE_OPEN)
    if (!fence) return null
    const nameStart = line.indexOf(fence[1], 3)
    const nameEnd = nameStart + fence[1].length
    if (column > nameEnd || !(fence[1] in BLOCKS)) return null
    return blockInfo(fence[1] as BlockName, lineStart, lineStart + nameEnd)
  }

  const match = line.match(KEY_LINE)
  if (!match) return null
  const [, indent, dash = '', key] = match
  const keyStart = indent.length + dash.length
  const keyEnd = keyStart + key.length
  if (column < keyStart || column > keyEnd) return null
  const from = lineStart + keyStart
  const to = lineStart + keyEnd

  if (zone === 'frontmatter') {
    const schema = frontmatterField(key, indent, allLines.slice(0, lineIndex))
    return schema ? fieldInfo(key, schema, from, to) : null
  }

  // Поля элемента блока пишутся без отступа (как FIELD_LINE в src/dsl/sections.ts)
  const block = state.block && state.block in BLOCKS ? BLOCKS[state.block as BlockName] : null
  const schema = indent === '' && !dash && block?.item ? (block.item.shape as Record<string, z.ZodType>)[key] : undefined
  return schema ? fieldInfo(key, schema, from, to) : null
}

function render(info: HoverInfo): HTMLElement {
  const dom = document.createElement('div')
  dom.className = 'cm-dsl-hover'
  const title = document.createElement('div')
  title.className = 'cm-dsl-hover-title'
  title.textContent = info.title
  dom.append(title)
  for (const text of info.lines) {
    const p = document.createElement('p')
    p.textContent = text
    dom.append(p)
  }
  if (info.fields?.length) {
    const list = document.createElement('ul')
    for (const field of info.fields) {
      const item = document.createElement('li')
      const key = document.createElement('code')
      key.textContent = field.key
      item.append(key, `${field.required ? ' (обязательно)' : ''} — ${field.description}`)
      list.append(item)
    }
    const heading = document.createElement('p')
    heading.textContent = 'Поля элемента:'
    dom.append(heading, list)
  }
  return dom
}

export function dslHover(): Extension {
  return hoverTooltip((view, pos) => {
    const info = hoverInfoAt(view.state.doc.toString(), pos)
    if (!info) return null
    return { pos: info.from, end: info.to, above: true, create: () => ({ dom: render(info) }) }
  })
}
