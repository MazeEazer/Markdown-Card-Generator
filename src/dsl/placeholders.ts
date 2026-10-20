// Заглушки из примеров промпта и пустые поля в ответе нейросети. Только для AI-генерации (generate.ts).
// Примеры для нейросети показывают формат с условным текстом «… — из описания» (prompt.ts). Слабые модели
// (GigaChat-3-Lightning) переносят такие значения в сайт как есть: «Маникюр — из описания», «Из описания».
// Маркер один на все заглушки — по нему они и строятся, и находятся.
import { isMap, isScalar, isSeq, type Node, type Pair, type YAMLMap } from 'yaml'
import { z } from 'zod'
import { parseDocument } from './parser.ts'
import { splice } from './prune.ts'
import { BLOCKS, type BlockName } from './schema/blocks.ts'
import { PLACEHOLDER_MARKER } from './schema/placeholder.ts'
import type { Range } from './types.ts'

export { PLACEHOLDER_MARKER }

/** Коды в журнале (fixed_codes): удалено значение-заглушка и удалено пустое поле. */
export const PLACEHOLDER_VALUE = 'placeholder-value'
export const EMPTY_FIELD = 'empty-field'

export function isPlaceholder(value: string): boolean {
  return value.toLowerCase().includes(PLACEHOLDER_MARKER)
}

export interface CleanResult {
  text: string
  removed: string[]
}

/** Строки целиком вокруг [from, to). */
function wholeLines(text: string, from: number, to: number): Range {
  const start = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', Math.max(from, to - 1))
  return { from: start, to: newline === -1 ? text.length : newline + 1 }
}

const scalarText = (node: unknown): string | null =>
  isScalar(node) && node.value !== null ? String((node as { source?: string }).source ?? node.value) : null

/** Поле без значения: «phone:» — YAML читает как null. Вложенные contacts: и links: — не пустые. */
const isEmptyValue = (node: unknown) => node === null || node === undefined || (isScalar(node) && (node.value === null || String(node.value).trim() === ''))

/** Удаляет заглушки и пустые поля: в шапке, в элементах блоков и строки текста разделов. */
export function removePlaceholders(text: string): CleanResult {
  const ast = parseDocument(text)
  const cuts: Range[] = []
  const removed: string[] = []

  const frontmatter = ast.frontmatter
  if (frontmatter && !frontmatter.errors.length && isMap(frontmatter.yaml.contents)) {
    const lines = (pair: Pair) => {
      const from = (pair.key as Node).range![0]
      const to = ((pair.value ?? pair.key) as Node).range![1]
      return wholeLines(text, frontmatter.yamlFrom + from, frontmatter.yamlFrom + to)
    }
    const visit = (map: YAMLMap) => {
      for (const pair of map.items) {
        if (isMap(pair.value)) {
          visit(pair.value)
        } else if (isSeq(pair.value)) {
          for (const item of pair.value.items) if (isMap(item)) visit(item)
        } else if (isEmptyValue(pair.value)) {
          cuts.push(lines(pair))
          removed.push(EMPTY_FIELD)
        } else if (isPlaceholder(scalarText(pair.value) ?? '')) {
          cuts.push(lines(pair))
          removed.push(PLACEHOLDER_VALUE)
        }
      }
    }
    visit(frontmatter.yaml.contents as YAMLMap)
  }

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      const required = Object.entries((BLOCKS[block.name as BlockName]?.item?.shape ?? {}) as Record<string, z.ZodType>)
        .filter(([, schema]) => !(schema instanceof z.ZodOptional))
        .map(([key]) => key)
      for (const item of block.items) {
        const bad = item.fields.filter((field) => !field.value.trim() || isPlaceholder(field.value))
        if (!bad.length) continue
        removed.push(...bad.map((field) => (field.value.trim() ? PLACEHOLDER_VALUE : EMPTY_FIELD)))
        // Без обязательного поля элемент не нужен: «Как записаться? — из описания» тянет за собой и ответ
        if (bad.some((field) => required.includes(field.key))) cuts.push(wholeLines(text, item.from, item.to))
        else for (const field of bad) cuts.push(wholeLines(text, field.from, field.to))
      }
    }
    // Строки текста раздела (вне блоков) с заглушкой; если в разделе больше ничего нет — раздел целиком
    const bodyFrom = section.headingRange ? section.headingRange.to : section.from
    const lines: { range: Range; placeholder: boolean; empty: boolean }[] = []
    let at = bodyFrom
    for (const line of text.slice(bodyFrom, section.to).split('\n')) {
      const range = { from: at, to: at + line.length }
      at += line.length + 1
      if (section.blocks.some((b) => b.from <= range.from && range.from < b.to)) continue
      lines.push({ range, placeholder: isPlaceholder(line), empty: !line.trim() })
    }
    const placeholders = lines.filter((l) => l.placeholder)
    if (!placeholders.length) continue
    removed.push(...placeholders.map(() => PLACEHOLDER_VALUE))
    const onlyPlaceholders = !section.blocks.length && lines.every((l) => l.placeholder || l.empty)
    if (section.headingRange && onlyPlaceholders) cuts.push({ from: section.from, to: section.to })
    else for (const l of placeholders) cuts.push(wholeLines(text, l.range.from, l.range.to))
  }

  // Поле внутри удаляемого элемента — уже вырезано вместе с ним; остальное вырезаем с конца
  const unique = [...new Map(cuts.map((c) => [`${c.from}:${c.to}`, c])).values()]
  const outer = unique.filter((c) => !unique.some((o) => o !== c && o.from <= c.from && c.to <= o.to))
  let result = text
  for (const { from, to } of outer.sort((a, b) => b.from - a.from)) result = splice(result, from, to)
  return { text: result, removed }
}
