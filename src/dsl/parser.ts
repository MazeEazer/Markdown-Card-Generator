// Парсер DSL: текст → дерево разбора (AST) с позициями каждого узла.
// Правила разбора совпадают со старым src/lib/parser.ts (секции, `##` без названия, блоки `:::`),
// чтобы CardData не менялся; позиции нужны валидатору и редактору.
import { isMap, isNode, isScalar, parseDocument as parseYamlDocument } from 'yaml'
import type {
  BlockFieldNode,
  BlockItemNode,
  BlockNode,
  DocumentNode,
  FrontmatterField,
  FrontmatterNode,
  SectionNode,
} from './ast.ts'
import { FENCE_CLOSE, FENCE_OPEN, FIELD_LINE } from './sections.ts'
import type { Range } from './types.ts'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/** Маркер «куска» секции: `##` без названия превращается в разделитель. */
const SECTION_DIVIDER = '***'

/** Заголовок секции: `## Название`, `## ` или `##` (без названия). */
const SECTION_HEADING = /^##(?:\s+(.*))?$/

/** Строка текста с её позицией. */
interface Line extends Range {
  text: string
}

function leadingSpaces(text: string): number {
  return text.length - text.trimStart().length
}

/** Диапазон подстроки `part`, начинающейся с индекса `index` строки, без пробелов по краям. */
function trimmedRange(line: Line, index: number, part: string): Range {
  const from = line.from + index + leadingSpaces(part)
  return { from, to: from + part.trim().length }
}

function parseFrontmatter(text: string): { frontmatter: FrontmatterNode | null; bodyFrom: number } {
  const match = text.match(FRONTMATTER)
  if (!match) return { frontmatter: null, bodyFrom: 0 }

  const yamlText = match[1]
  const yamlFrom = text.startsWith('---\r\n') ? 5 : 4
  const bodyFrom = text.length - match[2].length
  const head = text.slice(0, bodyFrom)
  const to = bodyFrom - (head.endsWith('\r\n') ? 2 : head.endsWith('\n') ? 1 : 0)

  const yaml = parseYamlDocument(yamlText)
  const errors = yaml.errors.map((error) => ({
    from: yamlFrom + error.pos[0],
    to: yamlFrom + error.pos[1],
    code: error.code,
    message: error.message,
  }))

  let data: Record<string, unknown> = {}
  if (!errors.length) {
    const js: unknown = yaml.toJS()
    if (js && typeof js === 'object' && !Array.isArray(js)) data = js as Record<string, unknown>
  }

  const fields: FrontmatterField[] = []
  if (isMap(yaml.contents)) {
    for (const pair of yaml.contents.items) {
      if (!isScalar(pair.key) || !pair.key.range) continue
      const value = pair.value
      const empty = !isNode(value) || !value.range || (isScalar(value) && value.value === null && value.range[0] === value.range[1])
      fields.push({
        key: String(pair.key.value),
        keyRange: { from: yamlFrom + pair.key.range[0], to: yamlFrom + pair.key.range[1] },
        valueRange: empty ? null : { from: yamlFrom + value.range![0], to: yamlFrom + value.range![1] },
        value: isNode(value) ? value.toJS(yaml) : value,
      })
    }
  }

  return { frontmatter: { from: 0, to, yamlFrom, yamlText, yaml, data, fields, errors }, bodyFrom }
}

/** Разбивает строки тела блока на элементы (по пустым строкам) и поля `key: value`. */
function parseItems(lines: Line[]): BlockItemNode[] {
  const items: BlockItemNode[] = []
  let item: BlockItemNode | null = null
  let field: BlockFieldNode | null = null

  for (const line of lines) {
    const trimmed = line.text.trim()
    if (!trimmed) {
      item = null
      field = null
      continue
    }

    const lineRange = trimmedRange(line, 0, line.text)
    if (!item) {
      item = { from: lineRange.from, to: lineRange.to, fields: [], stray: [] }
      items.push(item)
    }
    item.to = lineRange.to

    const match = trimmed.match(FIELD_LINE)
    if (match) {
      const keyFrom = lineRange.from
      const valueIndex = leadingSpaces(line.text) + trimmed.length - match[2].length
      field = {
        from: keyFrom,
        to: lineRange.to,
        key: match[1].toLowerCase(),
        keyRange: { from: keyFrom, to: keyFrom + match[1].length },
        value: match[2].trim(),
        valueRange: trimmedRange(line, valueIndex, match[2]),
      }
      item.fields.push(field)
    } else if (field) {
      const wasEmpty = !field.value
      field.value = wasEmpty ? trimmed : `${field.value} ${trimmed}`
      field.valueRange = { from: wasEmpty ? lineRange.from : field.valueRange.from, to: lineRange.to }
      field.to = lineRange.to
    } else {
      item.stray.push(lineRange)
    }
  }

  return items
}

interface OpenBlock {
  node: BlockNode
  body: Line[]
}

function openBlock(line: Line, match: RegExpMatchArray): OpenBlock {
  const nameIndex = line.text.indexOf(match[1], 3)
  const attrsIndex = line.text.length - match[2].length
  const attrsRange = trimmedRange(line, attrsIndex, match[2])
  return {
    node: {
      from: line.from,
      to: line.to,
      name: match[1].toLowerCase(),
      nameRange: { from: line.from + nameIndex, to: line.from + nameIndex + match[1].length },
      attrs: match[2].trim(),
      attrsRange,
      openRange: { from: line.from, to: line.to },
      closeRange: null,
      bodyRange: { from: line.to + 1, to: line.to + 1 },
      items: [],
    },
    body: [],
  }
}

function closeBlock(block: OpenBlock, close: Line | null, end: number): void {
  const { node, body } = block
  node.closeRange = close ? { from: close.from, to: close.to } : null
  node.to = close ? close.to : end
  node.bodyRange = body.length
    ? { from: body[0].from, to: body[body.length - 1].to }
    : { from: Math.min(node.openRange.to + 1, node.to), to: Math.min(node.openRange.to + 1, node.to) }
  node.items = parseItems(body)
}

interface OpenSection {
  node: SectionNode
  lines: string[]
}

function parseSections(text: string, bodyFrom: number): SectionNode[] {
  const sections: SectionNode[] = []
  let section: OpenSection | null = null
  let block: OpenBlock | null = null
  let offset = bodyFrom

  const start = (line: Line, title: string, heading: boolean, titleRange: Range | null = null): OpenSection => ({
    node: {
      from: line.from,
      to: line.to,
      title,
      headingRange: heading ? { from: line.from, to: line.to } : null,
      titleRange,
      content: '',
      blocks: [],
    },
    lines: [],
  })

  const flush = () => {
    if (!section) return
    section.node.content = section.lines.join('\n').trim()
    sections.push(section.node)
    section = null
  }

  for (const raw of text.slice(bodyFrom).split('\n')) {
    const line: Line = { text: raw, from: offset, to: offset + raw.length }
    offset = line.to + 1

    // Внутри :::code / :::accordion / :::cards заголовки не ищем
    if (block && section) {
      section.lines.push(line.text)
      section.node.to = line.to
      if (FENCE_CLOSE.test(line.text)) {
        closeBlock(block, line, line.to)
        block = null
      } else {
        block.body.push(line)
      }
      continue
    }

    const fence = line.text.match(FENCE_OPEN)
    if (fence) {
      section ??= start(line, '', false)
      section.lines.push(line.text)
      section.node.to = line.to
      block = openBlock(line, fence)
      section.node.blocks.push(block.node)
      continue
    }

    const heading = line.text.match(SECTION_HEADING)
    const headingTitle = heading ? (heading[1] ?? '').trim() : null

    if (headingTitle) {
      // ## Название — начинаем новую секцию
      flush()
      section = start(line, headingTitle, true, trimmedRange(line, line.text.length - heading![1].length, heading![1]))
    } else if (headingTitle === '') {
      // ## без названия — «кусок» раздела: содержимое остаётся в текущей секции
      if (section) {
        section.lines.push(SECTION_DIVIDER)
        section.node.to = line.to
      } else {
        section = start(line, '', true)
      }
    } else {
      // обычная строка: текст до первого ## тоже сохраняем (безымянный блок)
      if (!section && line.text.trim()) section = start(line, '', false)
      if (section) {
        section.lines.push(line.text)
        section.node.to = line.to
      }
    }
  }

  // Незакрытый ::: тянется до конца документа
  if (block) closeBlock(block, null, text.length)
  flush()
  return sections
}

/** Разбирает текст DSL в дерево с позициями. Не бросает исключений и не проверяет смысл — это делает validate(). */
export function parseDocument(text: string): DocumentNode {
  const { frontmatter, bodyFrom } = parseFrontmatter(text)
  return {
    from: 0,
    to: text.length,
    text,
    frontmatter,
    bodyFrom,
    sections: parseSections(text, bodyFrom),
  }
}
