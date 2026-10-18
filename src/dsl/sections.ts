// Разбор содержимого секции в данные CardData: таблицы, :::accordion, :::code, :::cards.
// Перенесено из src/lib/parser.ts без изменения поведения (его фиксируют тесты этапа 0):
// CardData строится из текста секции этими функциями, а позиции для диагностики даёт AST (parser.ts).
import type {
  AccordionItem,
  CardGridItem,
  CardSection,
  CodeBlockData,
  SectionType,
  ServiceItem,
  TableData,
} from '../types/card.ts'

export const FENCE_OPEN = /^:::\s*([A-Za-z][\w-]*)\s*(.*)$/
export const FENCE_CLOSE = /^:::\s*$/

/** Строка поля элемента блока: `key: value` (ключ — латиница). */
export const FIELD_LINE = /^([A-Za-z][\w-]*)\s*:\s?(.*)$/

interface FenceBlock {
  attrs: string
  body: string
}

/** Извлекает тело блока :::name ... ::: вместе с атрибутами открывающей строки. */
function extractFence(content: string, name: string): FenceBlock | null {
  const lines = content.split(/\r?\n/)
  const target = name.toLowerCase()

  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(FENCE_OPEN)
    if (!open || open[1].toLowerCase() !== target) continue

    const body: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      if (FENCE_CLOSE.test(lines[j])) return { attrs: open[2].trim(), body: body.join('\n').trim() }
      body.push(lines[j])
    }

    // Блок без закрывающего ::: — считаем, что он идёт до конца секции
    return { attrs: open[2].trim(), body: body.join('\n').trim() }
  }

  return null
}

/** Разбивает тело блока на элементы по пустым строкам. */
function splitBlocks(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

/** Парсит поля `key: value` одного элемента; строки без ключа дописываются к предыдущему значению. */
function parseFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {}
  let current: string | null = null

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const match = line.match(FIELD_LINE)
    if (match) {
      current = match[1].toLowerCase()
      fields[current] = match[2].trim()
    } else if (current) {
      fields[current] = fields[current] ? `${fields[current]} ${line}` : line
    }
  }

  return fields
}

function isTableSeparator(line: string): boolean {
  return line.includes('-') && /^\s*\|?[\s:|-]*\|?\s*$/.test(line)
}

function isTableContent(content: string): boolean {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.some((line) => line.includes('|'))) return false
  if (lines.some(isTableSeparator)) return true

  // Таблица без строки-разделителя — минимум две строки, обрамлённые пайпами
  return lines.filter((line) => /^\|.*\|$/.test(line)).length >= 2
}

/** Парсит Markdown-таблицу в заголовки и строки. */
export function parseTable(content: string): TableData {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))

  if (!lines.length) return { headers: [], rows: [] }

  const cells = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())

  const headers = cells(lines[0])
  const rows = lines
    .slice(1)
    .filter((line) => !isTableSeparator(line))
    .map((line) => {
      const row = cells(line)
      return headers.map((_, index) => row[index] ?? '')
    })

  return { headers, rows }
}

/** Парсит блок :::accordion в список «вопрос — ответ». */
export function parseAccordion(content: string): AccordionItem[] {
  const fence = extractFence(content, 'accordion')
  if (!fence) return []

  return splitBlocks(fence.body)
    .map((block) => {
      const fields = parseFields(block)
      return { title: fields.title ?? '', content: fields.content ?? '' }
    })
    .filter((item) => item.title || item.content)
}

/** Парсит блок :::code lang="..." в язык и код. */
export function parseCodeBlock(content: string): CodeBlockData {
  const fence = extractFence(content, 'code')
  if (!fence) return { lang: '', code: content.trim() }

  const langMatch = fence.attrs.match(/lang\s*=\s*["']?([\w#+-]+)["']?/i)
  return { lang: langMatch ? langMatch[1].toLowerCase() : '', code: fence.body }
}

/** Парсит блок :::cards в список карточек. */
export function parseCardGrid(content: string): CardGridItem[] {
  const fence = extractFence(content, 'cards')
  if (!fence) return []

  return splitBlocks(fence.body)
    .map((block) => {
      const fields = parseFields(block)
      const tags = (fields.tags ?? '')
        .split(/[,;]/)
        .map((tag) => tag.trim())
        .filter(Boolean)

      return {
        title: fields.title ?? '',
        description: fields.description ?? '',
        icon: fields.icon || undefined,
        url: (fields.url || fields.link || '').trim() || undefined,
        tags: tags.length ? tags : undefined,
      }
    })
    .filter((card) => card.title || card.description || card.url)
}

/** Парсит блок :::services в список услуг. */
export function parseServices(content: string): ServiceItem[] {
  const fence = extractFence(content, 'services')
  if (!fence) return []

  return splitBlocks(fence.body)
    .map((block) => {
      const fields = parseFields(block)
      return {
        title: fields.title ?? '',
        price: fields.price || undefined,
        duration: fields.duration || undefined,
        description: fields.description || undefined,
      }
    })
    .filter((service) => service.title || service.price || service.description)
}

/** Синоним parseCardGrid — блок называется :::cards. */
export const parseCards = parseCardGrid

/** Определяет тип секции по её содержимому. */
export function detectSectionType(content: string): SectionType {
  if (extractFence(content, 'code')) return 'code-block'
  if (extractFence(content, 'accordion')) return 'accordion'
  if (extractFence(content, 'cards')) return 'card-grid'
  if (extractFence(content, 'services')) return 'services'
  if (extractFence(content, 'contacts')) return 'contacts'
  if (isTableContent(content)) return 'table'
  return 'text'
}

/** Собирает секцию вместе с распарсенными данными её типа. */
export function buildSection(title: string, content: string): CardSection {
  const type = detectSectionType(content)
  const section: CardSection = { title, content, type }

  if (type === 'table') section.table = parseTable(content)
  else if (type === 'accordion') section.accordion = parseAccordion(content)
  else if (type === 'code-block') section.code = parseCodeBlock(content)
  else if (type === 'card-grid') section.cards = parseCardGrid(content)
  else if (type === 'services') section.services = parseServices(content)

  return section
}
