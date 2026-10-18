// AST → CardData: данные, которые рендерят темы. Логика полей перенесена из src/lib/parser.ts
// без изменений; новые поля бизнеса (phone, contacts, ...) читаются из исходного текста YAML.
import { isMap, isScalar, type Document } from 'yaml'
import type { CardContacts, CardData, CardLink, ParseResult, ThemeName } from '../types/card.ts'
import type { DocumentNode, SectionNode } from './ast.ts'
import { CONTACT_NAMES, THEME_NAMES } from './schema/frontmatter.ts'
import { buildSection } from './sections.ts'

const CONTACT_KEYS: (keyof CardContacts)[] = [...CONTACT_NAMES, 'primary']

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
  return THEME_NAMES.includes(normalized as ThemeName) ? (normalized as ThemeName) : 'auto'
}

/** Принимаем только #hex и приводим к 6 знакам — суффиксы прозрачности требуют формата #rrggbb. */
export function parseAccent(raw: unknown): string {
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

/**
 * Значение-строка поля YAML в том виде, как его написал человек.
 * `phone: +79991234567` YAML читает как число и теряет «+», поэтому берём исходный текст.
 */
function scalarText(yaml: Document, path: string[]): string | undefined {
  const node = yaml.getIn(path, true)
  if (!isScalar(node) || node.value === null || node.value === undefined) return undefined
  const text = (node.type === 'PLAIN' && node.source !== undefined ? node.source : String(node.value)).trim()
  return text || undefined
}

function parseContacts(yaml: Document): CardContacts | undefined {
  if (!isMap(yaml.get('contacts', true))) return undefined

  const contacts: CardContacts = {}
  for (const key of CONTACT_KEYS) {
    const value = scalarText(yaml, ['contacts', key])
    if (value) contacts[key] = value
  }
  return Object.keys(contacts).length ? contacts : undefined
}

/** Собирает CardData из дерева разбора. Ошибка — только если нет name (как и раньше). */
export function toCardData(ast: DocumentNode): ParseResult {
  const frontmatter = ast.frontmatter
  const data = frontmatter?.data ?? {}

  const name = String(data.name ?? '').trim()
  const title = String(data.title ?? '').trim()

  if (!frontmatter || !name) {
    return { data: null, error: 'Укажите имя в frontmatter: name: ...' }
  }

  const { yaml } = frontmatter
  const card: CardData = {
    name,
    title,
    theme: parseTheme(data.theme),
    accent: parseAccent(data.accent),
    avatar: data.avatar ? String(data.avatar) : undefined,
    location: data.location ? String(data.location) : undefined,
    links: parseLinks(data.links),
    sections: visibleSections(ast).map((section) => buildSection(section.title, section.content)),
    business: scalarText(yaml, ['business']),
    phone: scalarText(yaml, ['phone']),
    address: scalarText(yaml, ['address']),
    city: scalarText(yaml, ['city']),
    currency: scalarText(yaml, ['currency']),
    contacts: parseContacts(yaml),
  }

  return { data: card, error: null }
}

export const FALLBACK_CARD: CardData = {
  name: 'Без имени',
  title: '',
  theme: 'auto',
  accent: 'auto',
  links: [],
  sections: [],
}

/** Секции, которые попадают на сайт: пустые пропускаются. Один фильтр для CardData и для связи превью с редактором. */
export function visibleSections(ast: DocumentNode): SectionNode[] {
  return ast.sections.filter((section) => section.content)
}

/**
 * Куда перевести курсор редактора при клике по превью: шапка сайта → поле name,
 * i-я секция на сайте → начало i-й видимой секции в тексте.
 */
export function previewTargets(ast: DocumentNode): { header: number; sections: number[] } {
  const name = ast.frontmatter?.fields.find((field) => field.key === 'name')
  return {
    header: name?.keyRange.from ?? ast.frontmatter?.from ?? 0,
    sections: visibleSections(ast).map((section) => section.from),
  }
}
