import { parse as parseYaml } from 'yaml'
import type {
  AccordionItem,
  CardData,
  CardGridItem,
  CardLink,
  CardSection,
  CodeBlockData,
  ParseResult,
  SectionType,
  TableData,
  ThemeName,
} from '../types/card'

const VALID_THEMES: ThemeName[] = ['glass', 'minimal', 'noir', 'vercel']

function parseFrontmatter(markdown: string): { data: Record<string, unknown>; content: string } {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { data: {}, content: markdown }
  }

  try {
    const data = (parseYaml(match[1]) ?? {}) as Record<string, unknown>
    return { data, content: match[2] }
  } catch {
    return { data: {}, content: markdown }
  }
}

function parseLinks(raw: unknown): CardLink[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      label: String(item.label ?? ''),
      url: String(item.url ?? ''),
      icon: item.icon ? String(item.icon) : undefined,
    }))
    .filter((link) => link.label && link.url)
}

function parseTheme(raw: unknown): CardData['theme'] {
  if (typeof raw !== 'string') return 'auto'
  const normalized = raw.split('#')[0].toLowerCase().trim()
  if (normalized === 'auto') return 'auto'
  return VALID_THEMES.includes(normalized as ThemeName) ? (normalized as ThemeName) : 'auto'
}

/** Принимаем только #hex и приводим к 6 знакам — суффиксы прозрачности требуют формата #rrggbb. */
function parseAccent(raw: unknown): string {
  if (raw === undefined || raw === null) return 'auto'

  const value = String(raw)
    .trim()
    .split(/\s+#/)[0] // отрезаем inline-комментарий, если он попал в значение
    .trim()
    .toLowerCase()

  if (value === 'auto' || !value) return 'auto'

  const hex = value.replace('#', '')
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  if (/^[0-9a-f]{4}$/.test(hex)) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`
  if (/^[0-9a-f]{8}$/.test(hex)) return `#${hex.slice(0, 6)}`

  return 'auto'
}

const FENCE_OPEN = /^:::\s*([A-Za-z][\w-]*)\s*(.*)$/
const FENCE_CLOSE = /^:::\s*$/

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

    const match = line.match(/^([A-Za-z][\w-]*)\s*:\s?(.*)$/)
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

/** Синоним parseCardGrid — блок называется :::cards. */
export const parseCards = parseCardGrid

/** Определяет тип секции по её содержимому. */
export function detectSectionType(content: string): SectionType {
  if (extractFence(content, 'code')) return 'code-block'
  if (extractFence(content, 'accordion')) return 'accordion'
  if (extractFence(content, 'cards')) return 'card-grid'
  if (isTableContent(content)) return 'table'
  return 'text'
}

/** Собирает секцию вместе с распарсенными данными её типа. */
function buildSection(title: string, content: string): CardSection {
  const type = detectSectionType(content)
  const section: CardSection = { title, content, type }

  if (type === 'table') section.table = parseTable(content)
  else if (type === 'accordion') section.accordion = parseAccordion(content)
  else if (type === 'code-block') section.code = parseCodeBlock(content)
  else if (type === 'card-grid') section.cards = parseCardGrid(content)

  return section
}

/** Маркер «куска» секции: `##` без названия превращается в разделитель. */
const SECTION_DIVIDER = '***'

/** Заголовок секции: `## Название`, `## ` или `##` (без названия). */
const SECTION_HEADING = /^##(?:\s+(.*))?$/

function parseSections(content: string): CardSection[] {
  const sections: CardSection[] = []
  const lines = content.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []
  let open = false
  let inFence = false

  const flush = () => {
    const body = currentLines.join('\n').trim()
    if (open && body) {
      sections.push(buildSection(currentTitle, body))
    }
    currentTitle = ''
    currentLines = []
    open = false
  }

  for (const line of lines) {
    // Внутри :::code / :::accordion / :::cards заголовки не ищем
    if (inFence) {
      currentLines.push(line)
      if (FENCE_CLOSE.test(line)) inFence = false
      continue
    }

    if (FENCE_OPEN.test(line)) {
      open = true
      currentLines.push(line)
      inFence = true
      continue
    }

    const heading = line.match(SECTION_HEADING)
    const headingTitle = heading ? (heading[1] ?? '').trim() : null

    if (headingTitle) {
      // ## Название — начинаем новую секцию
      flush()
      currentTitle = headingTitle
      open = true
    } else if (headingTitle === '') {
      // ## без названия — «кусок» раздела: содержимое остаётся в текущей секции
      if (open) currentLines.push(SECTION_DIVIDER)
      else open = true
    } else {
      // обычная строка: текст до первого ## тоже сохраняем (безымянный блок)
      if (!open && line.trim()) open = true
      if (open) currentLines.push(line)
    }
  }

  flush()
  return sections
}

export function parseCardMarkdown(markdown: string): ParseResult {
  try {
    const { data, content } = parseFrontmatter(markdown)

    const name = String(data.name ?? '').trim()
    const title = String(data.title ?? '').trim()

    if (!name) {
      return { data: null, error: 'Укажите имя в frontmatter: name: ...' }
    }

    const accent = parseAccent(data.accent)

    const card: CardData = {
      name,
      title,
      theme: parseTheme(data.theme),
      accent,
      avatar: data.avatar ? String(data.avatar) : undefined,
      location: data.location ? String(data.location) : undefined,
      links: parseLinks(data.links),
      sections: parseSections(content),
    }

    return { data: card, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка парсинга Markdown'
    return { data: null, error: message }
  }
}

export const FALLBACK_CARD: CardData = {
  name: 'Без имени',
  title: '',
  theme: 'auto',
  accent: 'auto',
  links: [],
  sections: [],
}
