import { parse as parseYaml } from 'yaml'
import type { CardData, CardLink, CardSection, ParseResult, ThemeName } from '../types/card'

const VALID_THEMES: ThemeName[] = ['glass', 'minimal', 'noir']

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

function parseSections(content: string): CardSection[] {
  const sections: CardSection[] = []
  const lines = content.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []

  const flush = () => {
    const body = currentLines.join('\n').trim()
    if (currentTitle && body) {
      sections.push({ title: currentTitle, content: body })
    }
    currentTitle = ''
    currentLines = []
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      flush()
      currentTitle = match[1].trim()
    } else if (currentTitle) {
      currentLines.push(line)
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

    const accentRaw = data.accent
    const accent =
      accentRaw === 'auto' || accentRaw === undefined || accentRaw === null
        ? 'auto'
        : String(accentRaw).split('#')[0].trim()

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
