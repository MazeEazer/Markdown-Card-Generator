// Заглушки из примеров промпта и пустые поля в ответе нейросети. Только для AI-генерации (generate.ts).
// Примеры для нейросети показывают формат с условным текстом «… — из описания» (prompt.ts). Слабые модели
// (GigaChat-3-Lightning) переносят такие значения в сайт как есть: «Вопрос 1 — из описания», «Из описания» —
// это заглушка целиком, её удаляем. Но маркер они дописывают и к настоящим значениям («Маникюр с покрытием —
// из описания», шаг 8): тогда отрезаем маркер, а значение оставляем — ложное удаление хуже заглушки на сайте.
import { isMap, isScalar, isSeq, type Node, type Pair, type YAMLMap } from 'yaml'
import { z } from 'zod'
import { parseDocument } from './parser.ts'
import { splice } from './prune.ts'
import { BLOCKS, type BlockName } from './schema/blocks.ts'
import { PLACEHOLDER_BASES, PLACEHOLDER_MARKER } from './schema/placeholder.ts'
import type { Range } from './types.ts'
import { stemMatcher, wordsOf } from './words.ts'

export { PLACEHOLDER_MARKER }

/** Коды в журнале (fixed_codes): заглушка удалена, маркер отрезан от настоящего значения, пустое поле удалено. */
export const PLACEHOLDER_VALUE = 'placeholder-value'
export const PLACEHOLDER_STRIPPED = 'placeholder-stripped'
export const EMPTY_FIELD = 'empty-field'

export function isPlaceholder(value: string): boolean {
  return value.toLowerCase().includes(PLACEHOLDER_MARKER)
}

/** Основы заглушек: описания полей со свободным текстом (по ним строится «Вопрос 1 — из описания») и PLACEHOLDER_BASES. */
const TEMPLATE_BASES = new Set(
  [
    ...Object.values(PLACEHOLDER_BASES),
    'Текст',
    ...Object.values(BLOCKS).flatMap((block) =>
      Object.values((block.item?.shape ?? {}) as Record<string, z.ZodType>).flatMap((schema) => {
        const inner = schema instanceof z.ZodOptional ? (schema.unwrap() as z.ZodType) : schema
        const meta = inner.meta() as { description?: string; prose?: boolean } | undefined
        return meta?.prose && meta.description ? [meta.description] : []
      }),
    ),
  ].map((base) => base.toLowerCase()),
)

/** Значение без маркера: «Маникюр — из описания» → «Маникюр», «Из описания» → «». */
export function withoutMarker(value: string): string {
  return value.replace(/\s*[—–-]?\s*\(?\s*из описания\s*\)?[.,]?/gi, ' ').replace(/\s+/g, ' ').trim()
}

/** Короткие служебные слова — по ним не судим, есть ли значение в описании. */
const FILLER = new Set(['как', 'для', 'или', 'что', 'это', 'есть', 'можно', 'через', 'при', 'без', 'все', 'всё', 'так', 'где', 'когда', 'ваш', 'наш', 'вас', 'нас'])

/**
 * Заглушка целиком: без маркера пусто, осталась основа шаблона («Вопрос 1», «улица и дом») или текст, которого
 * нет в описании («Часто задаваемые вопросы», «Ответ на вопрос 1» — модель пересказала шаблон своими словами).
 * Иначе это настоящее значение с дописанным маркером («Маникюр с покрытием — из описания»): все значимые
 * слова — по основам — есть в описании.
 */
export function isWholePlaceholder(value: string, inDescription: (word: string) => boolean): boolean {
  const rest = withoutMarker(value)
  if (!rest || TEMPLATE_BASES.has(rest.toLowerCase().replace(/\s*\d+$/, ''))) return true
  return !wordsOf(rest)
    .filter((word) => word.length >= 3 && !FILLER.has(word))
    .every(inDescription)
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

/** Пустое значение: ничего, пробелы или только тире («duration: —»). */
const blank = (value: string) => /^[\s—–\-.]*$/.test(value)

/** Поле без значения: «phone:» — YAML читает как null. Вложенные contacts: и links: — не пустые. */
const isEmptyValue = (node: unknown) =>
  node === null || node === undefined || (isScalar(node) && (node.value === null || blank(String(node.value))))

/** Значение для YAML: в кавычках, если в нём двоеточие, # или особый символ в начале. */
const yamlScalar = (value: string) => (/[:#]|^[-?[\]{}&*!|>'"%@`,]/.test(value) ? JSON.stringify(value) : value)

interface Edit extends Range {
  insert: string
}

/** Удаляет заглушки и пустые поля, отрезает маркер от настоящих значений: в шапке, в блоках и в тексте разделов. */
export function removePlaceholders(text: string, description: string): CleanResult {
  const inDescription = stemMatcher(description)
  const ast = parseDocument(text)
  const cuts: Range[] = []
  const edits: Edit[] = []
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
        const value = scalarText(pair.value) ?? ''
        if (isMap(pair.value)) {
          visit(pair.value)
        } else if (isSeq(pair.value)) {
          for (const item of pair.value.items) if (isMap(item)) visit(item)
        } else if (isEmptyValue(pair.value)) {
          cuts.push(lines(pair))
          removed.push(EMPTY_FIELD)
        } else if (isPlaceholder(value)) {
          if (isWholePlaceholder(value, inDescription)) {
            cuts.push(lines(pair))
            removed.push(PLACEHOLDER_VALUE)
          } else {
            const [from, to] = (pair.value as Node).range!
            edits.push({ from: frontmatter.yamlFrom + from, to: frontmatter.yamlFrom + to, insert: yamlScalar(withoutMarker(value)) })
            removed.push(PLACEHOLDER_STRIPPED)
          }
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
        const bad: typeof item.fields = []
        for (const field of item.fields) {
          if (blank(field.value)) {
            bad.push(field)
            removed.push(EMPTY_FIELD)
          } else if (isPlaceholder(field.value)) {
            if (isWholePlaceholder(field.value, inDescription)) {
              bad.push(field)
              removed.push(PLACEHOLDER_VALUE)
            } else {
              edits.push({ ...field.valueRange, insert: withoutMarker(field.value) })
              removed.push(PLACEHOLDER_STRIPPED)
            }
          }
        }
        if (!bad.length) continue
        // Без обязательного поля элемент не нужен: «Вопрос 1 — из описания» тянет за собой и ответ
        if (bad.some((field) => required.includes(field.key))) cuts.push(wholeLines(text, item.from, item.to))
        else for (const field of bad) cuts.push(wholeLines(text, field.from, field.to))
      }
    }
    // Строки текста раздела (вне блоков) с маркером; если в разделе остались одни заглушки — раздел целиком
    const bodyFrom = section.headingRange ? section.headingRange.to : section.from
    const lines: { range: Range; whole: boolean; marked: boolean; empty: boolean }[] = []
    let at = bodyFrom
    for (const line of text.slice(bodyFrom, section.to).split('\n')) {
      const range = { from: at, to: at + line.length }
      at += line.length + 1
      if (section.blocks.some((b) => b.from <= range.from && range.from < b.to)) continue
      const marked = isPlaceholder(line)
      lines.push({ range, marked, whole: marked && isWholePlaceholder(line, inDescription), empty: !line.trim() })
    }
    const marked = lines.filter((l) => l.marked)
    if (!marked.length) continue
    const onlyPlaceholders = !section.blocks.length && lines.every((l) => l.whole || l.empty)
    if (section.headingRange && onlyPlaceholders) {
      cuts.push({ from: section.from, to: section.to })
      removed.push(...marked.map(() => PLACEHOLDER_VALUE))
      continue
    }
    for (const l of marked) {
      if (l.whole) {
        cuts.push(wholeLines(text, l.range.from, l.range.to))
        removed.push(PLACEHOLDER_VALUE)
      } else {
        edits.push({ ...l.range, insert: withoutMarker(text.slice(l.range.from, l.range.to)) })
        removed.push(PLACEHOLDER_STRIPPED)
      }
    }
  }

  // Поле внутри удаляемого элемента — уже вырезано вместе с ним; правка внутри вырезанного — не нужна
  const unique = [...new Map(cuts.map((c) => [`${c.from}:${c.to}`, c])).values()]
  const outer = unique.filter((c) => !unique.some((o) => o !== c && o.from <= c.from && c.to <= o.to))
  const kept = edits.filter((e) => !outer.some((c) => c.from <= e.from && e.to <= c.to))
  const operations: Edit[] = [...outer.map((c) => ({ ...c, insert: '' })), ...kept]
  let result = text
  for (const op of operations.sort((a, b) => b.from - a.from)) {
    result = op.insert ? result.slice(0, op.from) + op.insert + result.slice(op.to) : splice(result, op.from, op.to)
  }
  return { text: result, removed }
}
