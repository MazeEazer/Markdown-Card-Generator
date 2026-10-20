// Удаление блоков, которые без данных бессмысленны: карта без адреса, «Контакты» без контактов, пустые
// часы работы и блоки без единого элемента. Только для AI-генерации (generate.ts): нейросеть добавляет
// «Как добраться» для онлайн-занятий, а в редакторе человек сам решает, дописать адрес или убрать блок.
import type { BlockNode, SectionNode } from './ast.ts'
import { parseDocument } from './parser.ts'
import { BLOCKS, type BlockName } from './schema/blocks.ts'
import { validate } from './validate.ts'

/** Замечания валидатора, после которых блок удаляется: показать в нём нечего. */
export const PRUNE_CODES: ReadonlySet<string> = new Set(['map-no-address', 'contacts-block-empty', 'hours-empty'])

/** Код в журнале для блока с элементами, в котором нет ни одного элемента (у валидатора такого правила нет). */
export const EMPTY_BLOCK = 'empty-block'

export interface PruneResult {
  text: string
  /** Коды удалённых блоков по порядку — для fixed_codes журнала */
  removed: string[]
}

/** Блок, в котором нет ни одного элемента, хотя у блока они должны быть (услуги, вопросы, отзывы, карточки). */
function isEmptyItemBlock(block: BlockNode): boolean {
  return Boolean(BLOCKS[block.name as BlockName]?.item) && block.name !== 'map' && block.items.length === 0
}

/** Конец строки, включая её перевод. */
function lineEnd(text: string, offset: number): number {
  const newline = text.indexOf('\n', offset)
  return newline === -1 ? text.length : newline + 1
}

/** Диапазон для удаления: секция целиком, если в ней ничего не останется, иначе — только блоки. */
function removals(text: string, section: SectionNode, blocks: BlockNode[]): { from: number; to: number }[] {
  const ranges = blocks.map((block) => ({ from: block.from, to: lineEnd(text, block.to - 1) }))
  const bodyFrom = section.headingRange ? lineEnd(text, section.headingRange.to - 1) : section.from
  let rest = text.slice(bodyFrom, section.to)
  for (const range of [...ranges].reverse()) rest = rest.slice(0, range.from - bodyFrom) + rest.slice(range.to - bodyFrom)
  // Заголовок «## Как добраться» без карты — пустой раздел; секцию без заголовка не трогаем
  if (section.headingRange && !rest.trim()) return [{ from: section.from, to: section.to }]
  return ranges
}

/** Вырезает [from, to) так, чтобы на стыке осталось не больше одной пустой строки, а в конце — один перевод строки. */
function splice(text: string, from: number, to: number): string {
  const before = text.slice(0, from)
  let after = text.slice(to)
  const trailing = before.length - before.replace(/\n+$/, '').length
  const leading = after.length - after.replace(/^\n+/, '').length
  if (trailing + leading > 2) after = '\n'.repeat(Math.max(0, 2 - trailing)) + after.slice(leading)
  if (!after.trim()) return `${before.replace(/\n+$/, '')}\n`
  return before + after
}

export function pruneEmptyBlocks(text: string): PruneResult {
  const ast = parseDocument(text)
  const diagnostics = validate(text).filter((d) => PRUNE_CODES.has(d.code))
  const removed: string[] = []
  const ranges: { from: number; to: number }[] = []

  for (const section of ast.sections) {
    const doomed = section.blocks.filter((block) => {
      const reason = diagnostics.find((d) => block.from <= d.from && d.from < block.to)?.code ?? (isEmptyItemBlock(block) ? EMPTY_BLOCK : null)
      if (reason) removed.push(reason)
      return reason !== null
    })
    if (doomed.length) ranges.push(...removals(text, section, doomed))
  }

  let result = text
  for (const { from, to } of ranges.sort((a, b) => b.from - a.from)) result = splice(result, from, to)
  return { text: result, removed }
}
