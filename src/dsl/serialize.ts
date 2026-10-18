// CardData → текст DSL. Нужен для AI-режима «JSON по схеме»: нейросеть заполняет данные,
// а разметку для редактора строим мы. Гарантия: parseDocument(serialize(card)) даёт тот же CardData
// (для блоков — те же данные блока; текст секции `content` у блоков на сайте не показывается).
import { stringify } from 'yaml'
import type {
  AccordionItem,
  CardData,
  CardGridItem,
  CardSection,
  CodeBlockData,
  ReviewItem,
  ServiceItem,
  TableData,
} from '../types/card.ts'
import { formatHoursLine } from './hours.ts'
import { CONTACT_NAMES } from './schema/frontmatter.ts'

/** Значение поля блока — одной строкой: строки-продолжения парсер всё равно склеивает пробелом. */
export function oneLine(value: string): string {
  return value.replace(/\s*\r?\n\s*/g, ' ').trim()
}

function frontmatter(card: CardData): string {
  // Порядок полей — как в схеме; значения по умолчанию (auto, пустые) не пишем
  const data: Record<string, unknown> = { name: card.name }
  if (card.title) data.title = card.title
  if (card.theme !== 'auto') data.theme = card.theme
  if (card.accent !== 'auto') data.accent = card.accent
  if (card.avatar) data.avatar = card.avatar
  if (card.location) data.location = card.location
  if (card.links.length) {
    data.links = card.links.map(({ label, url, icon }) => (icon ? { label, url, icon } : { label, url }))
  }
  if (card.business) data.business = card.business
  if (card.phone) data.phone = card.phone
  if (card.address) data.address = card.address
  if (card.city) data.city = card.city
  if (card.currency) data.currency = card.currency

  const contacts = card.contacts ?? {}
  const ordered = Object.fromEntries(
    [...CONTACT_NAMES, 'primary' as const].filter((key) => contacts[key]).map((key) => [key, contacts[key]]),
  )
  if (Object.keys(ordered).length) data.contacts = ordered

  return `---\n${stringify(data, { lineWidth: 0 })}---`
}

function table({ headers, rows }: TableData): string {
  const row = (cells: string[]) => `| ${cells.map(oneLine).join(' | ')} |`
  return [row(headers), row(headers.map(() => '---')), ...rows.map(row)].join('\n')
}

/** Элементы блока: поля `ключ: значение`, элементы разделены пустой строкой. Пустые поля не пишем. */
function items(entries: [string, string | undefined][][]): string {
  return entries
    .map((fields) =>
      fields
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${oneLine(value!)}`)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n')
}

function accordion(list: AccordionItem[]): string {
  return `:::accordion\n${items(list.map((item) => [['title', item.title], ['content', item.content]]))}\n:::`
}

function cards(list: CardGridItem[]): string {
  const body = items(
    list.map((card) => [
      ['title', card.title],
      ['description', card.description],
      ['icon', card.icon],
      ['url', card.url],
      ['tags', card.tags?.join(', ')],
    ]),
  )
  return `:::cards\n${body}\n:::`
}

function services(list: ServiceItem[]): string {
  const body = items(
    list.map((service) => [
      ['title', service.title],
      ['price', service.price],
      ['duration', service.duration],
      ['description', service.description],
    ]),
  )
  return `:::services\n${body}\n:::`
}

function reviews(list: ReviewItem[]): string {
  const body = items(
    list.map((review) => [
      ['author', review.author],
      ['text', review.text],
      ['rating', review.rating?.toString()],
      ['date', review.date],
    ]),
  )
  return `:::reviews\n${body}\n:::`
}

function code({ lang, code }: CodeBlockData): string {
  return `:::code${lang ? ` lang="${lang}"` : ''}\n${code}\n:::`
}

function sectionBody(section: CardSection): string {
  switch (section.type) {
    case 'table':
      return table(section.table ?? { headers: [], rows: [] })
    case 'accordion':
      return accordion(section.accordion ?? [])
    case 'code-block':
      return code(section.code ?? { lang: '', code: section.content })
    case 'card-grid':
      return cards(section.cards ?? [])
    case 'services':
      return services(section.services ?? [])
    case 'hours':
      return `:::hours\n${(section.hours ?? []).map(formatHoursLine).join('\n')}\n:::`
    case 'reviews':
      return reviews(section.reviews ?? [])
    case 'map':
      return section.map?.address ? `:::map\naddress: ${oneLine(section.map.address)}\n:::` : ':::map\n:::'
    case 'contacts':
      return ':::contacts\n:::'
    default:
      return section.content
  }
}

function section(item: CardSection, index: number): string {
  const body = sectionBody(item)
  const title = oneLine(item.title)
  // Секция без названия возможна только первой; дальше `##` без названия — разделитель внутри предыдущей
  if (!title) return index === 0 ? body : `##\n${body}`
  return `## ${title}\n${body}`
}

/** Собирает текст DSL из CardData. */
export function serialize(card: CardData): string {
  const sections = card.sections.map(section).join('\n\n')
  return `${frontmatter(card)}\n${sections ? `\n${sections}\n` : ''}`
}
