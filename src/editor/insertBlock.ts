// «Добавить блок»: поля формы по схеме блока → разметка → место вставки и проверка валидатором.
import { z } from 'zod'
import { enumOptions } from '../dsl/rules/helpers'
import { type BlockDefinition, BLOCKS, type BlockName } from '../dsl/schema/blocks'
import { FENCE_CLOSE } from '../dsl/sections'
import { oneLine } from '../dsl/serialize'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { fieldMeta } from './context'
import { stateAfterLines } from './language'

export interface FormField {
  key: string
  /** Подпись по-русски — описание поля из схемы */
  label: string
  required: boolean
  /** Подсказка в пустом поле — пример из схемы */
  placeholder: string
  /** Допустимые значения (icon) — выпадающий список */
  options: string[] | null
  /** Длинный текст — многострочное поле */
  multiline: boolean
}

const MULTILINE_KEYS = new Set(['description', 'content', 'text'])

function formFields(schema: z.ZodObject): FormField[] {
  return Object.entries(schema.shape as Record<string, z.ZodType>)
    .filter(([, field]) => !fieldMeta(field).deprecated)
    .map(([key, field]) => {
      const meta = fieldMeta(field)
      return {
        key,
        label: meta.description ?? key,
        required: !(field instanceof z.ZodOptional),
        placeholder: String(meta.examples?.[0] ?? ''),
        options: enumOptions(field),
        multiline: MULTILINE_KEYS.has(key),
      }
    })
}

export interface BlockForm {
  name: BlockName
  label: string
  description: string
  /** Атрибуты строки открытия (`:::code lang="js"`) */
  attrs: FormField[]
  /** Поля одного элемента; null — у блока нет элементов */
  item: FormField[] | null
  /** Как называется элемент: «Услуга», «Отзыв» */
  itemLabel: string
  /** Многострочное содержимое (часы, код): подсказка = строки примера */
  body: { placeholder: string; hint: string } | null
  /** Пояснение для блоков, внутри которых ничего писать не нужно */
  note: string | null
}

/** Описание формы для блока — целиком из схемы. */
export function blockForm(name: BlockName): BlockForm {
  const block: BlockDefinition = BLOCKS[name]
  const exampleBody = block.example.split('\n').slice(1, -1).join('\n')
  const hasBody = !block.item && exampleBody !== ''
  return {
    name,
    label: block.label,
    description: block.description,
    attrs: formFields(block.attrs),
    item: block.item ? formFields(block.item) : null,
    itemLabel: (block.item?.meta() as { description?: string } | undefined)?.description ?? 'Элемент',
    body: hasBody ? { placeholder: exampleBody, hint: block.body ?? '' } : null,
    note: hasBody ? null : (block.body ?? null),
  }
}

export interface BlockValues {
  heading: string
  attrs: Record<string, string>
  items: Record<string, string>[]
  body: string
}

export const emptyValues = (form: BlockForm): BlockValues => ({
  heading: form.label,
  attrs: {},
  items: form.item ? [{}] : [],
  body: '',
})

const filled = (item: Record<string, string>) => Object.values(item).some((value) => value.trim() !== '')

/** Разметка блока по значениям формы — по тем же правилам, что serialize: одна строка на поле, пустые не пишем. */
export function blockMarkup(form: BlockForm, values: BlockValues): string {
  const attrs = form.attrs
    .filter((field) => values.attrs[field.key]?.trim())
    .map((field) => ` ${field.key}="${oneLine(values.attrs[field.key]).replace(/"/g, "'")}"`)
    .join('')
  const lines = [`:::${form.name}${attrs}`]
  if (form.item) {
    const items = values.items.filter(filled).map((item) =>
      form.item!.filter((field) => item[field.key]?.trim()).map((field) => `${field.key}: ${oneLine(item[field.key])}`).join('\n'),
    )
    if (items.length) lines.push(items.join('\n\n'))
  } else if (form.body && values.body.trim()) {
    // Строки кода и часов сохраняем как есть, только без пустых краёв
    lines.push(values.body.replace(/^\s*\n|\n\s*$/g, ''))
  }
  lines.push(':::')
  const heading = oneLine(values.heading)
  return (heading ? `## ${heading}\n` : '') + lines.join('\n')
}

/** Что мешает вставить: пустые обязательные поля в заполненных элементах, пустой блок. Пустой список — можно. */
export function missingRequired(form: BlockForm, values: BlockValues): string[] {
  if (form.item) {
    const items = values.items.filter(filled)
    // У :::map поле одно и необязательное — пустой блок допустим
    if (items.length === 0 && form.item.some((field) => field.required)) {
      return [`Заполните хотя бы один элемент «${form.itemLabel}»`]
    }
    return items.flatMap((item, index) =>
      form
        .item!.filter((field) => field.required && !item[field.key]?.trim())
        .map((field) => `${form.itemLabel} ${index + 1}: заполните «${field.label}»`),
    )
  }
  if (form.body && !values.body.trim()) return ['Заполните содержимое блока']
  return []
}

/** Конец строки `index` (смещение перед `\n`). */
function lineEnd(lines: string[], index: number): number {
  return lines.slice(0, index + 1).reduce((sum, line) => sum + line.length + 1, 0) - 1
}

/**
 * Куда вставить блок, если курсор в `pos`: после текущей строки; если курсор в шапке или внутри блока —
 * после их конца, чтобы не разорвать их.
 */
export function insertionPoint(text: string, pos: number): number {
  const lines = text.split('\n')
  const lineIndex = text.slice(0, pos).split('\n').length - 1
  const state = stateAfterLines(lines.slice(0, lineIndex + 1))
  let target = lineIndex
  if (state.zone === 'frontmatter') {
    const close = lines.findIndex((line, i) => i > 0 && /^---\r?$/.test(line))
    target = close >= 0 ? close : lines.length - 1
  } else if (state.block !== null) {
    const close = lines.findIndex((line, i) => i > lineIndex && FENCE_CLOSE.test(line))
    target = close >= 0 ? close : lines.length - 1
  }
  return Math.min(lineEnd(lines, target), text.length)
}

export interface Insertion {
  from: number
  insert: string
  /** Где окажется начало блока — туда ставим курсор */
  blockStart: number
}

/** Вставка с пустыми строками вокруг блока — чтобы он не слипся с соседним текстом. */
export function insertBlock(text: string, pos: number, markup: string): Insertion {
  const from = insertionPoint(text, pos)
  const before = text.slice(0, from)
  const after = text.slice(from)
  const prefix = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after === '' ? '\n' : after === '\n' || after.startsWith('\n\n') ? '' : '\n'
  return { from, insert: prefix + markup + suffix, blockStart: from + prefix.length }
}

/** Замечания валидатора к вставляемому блоку — в настоящем документе, с его шапкой и соседями. */
export function blockProblems(text: string, pos: number, markup: string): Diagnostic[] {
  const { from, insert, blockStart } = insertBlock(text, pos, markup)
  const result = text.slice(0, from) + insert + text.slice(from)
  const blockEnd = blockStart + markup.length
  return validate(result).filter((d) => d.from >= blockStart && d.from < blockEnd)
}
