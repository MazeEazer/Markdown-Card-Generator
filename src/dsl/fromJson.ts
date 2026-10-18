// JSON по схеме документа (ответ нейросети в режиме «JSON по схеме») → CardData.
// Проверку JSON схемой делает вызывающий код (documentSchema.safeParse); здесь — только перенос полей.
import type { CardData, CardSection } from '../types/card.ts'
import { parseAccent } from './cardData.ts'
import { parseHoursBody } from './hours.ts'
import { normalizeRating, parseRating } from './rating.ts'
import type { DocumentJson, SectionJson } from './schema/document.ts'

function section(json: SectionJson): CardSection {
  const base = { title: json.title.trim(), content: '' }
  switch (json.type) {
    case 'text':
      return { ...base, type: 'text', content: json.content.trim() }
    case 'table':
      return {
        ...base,
        type: 'table',
        table: { headers: json.headers, rows: json.rows.map((row) => json.headers.map((_, i) => row[i] ?? '')) },
      }
    case 'cards':
      return {
        ...base,
        type: 'card-grid',
        cards: json.items.map((item) => {
          const tags = (item.tags ?? '').split(/[,;]/).map((tag) => tag.trim()).filter(Boolean)
          return {
            title: item.title,
            description: item.description ?? '',
            icon: item.icon,
            url: item.url,
            tags: tags.length ? tags : undefined,
          }
        }),
      }
    case 'accordion':
      return { ...base, type: 'accordion', accordion: json.items }
    case 'code':
      return { ...base, type: 'code-block', code: { lang: (json.lang ?? '').toLowerCase(), code: json.code.trim() } }
    case 'services':
      return {
        ...base,
        type: 'services',
        services: json.items.map((item) => ({
          title: item.title.trim(),
          price: item.price?.trim() || undefined,
          duration: item.duration?.trim() || undefined,
          description: item.description?.trim() || undefined,
        })),
      }
    case 'hours':
      return { ...base, type: 'hours', hours: parseHoursBody(json.lines.join('\n')) }
    case 'reviews':
      return {
        ...base,
        type: 'reviews',
        reviews: json.items.map((item) => ({
          author: item.author.trim(),
          text: item.text.trim(),
          // Нейросеть может ответить «5/5» — приводим так же, как исправил бы валидатор
          rating: item.rating ? (parseRating(item.rating) ?? normalizeRating(item.rating) ?? undefined) : undefined,
          date: item.date?.trim() || undefined,
        })),
      }
    case 'contacts':
      return { ...base, type: 'contacts' }
  }
}

export function fromJson(json: DocumentJson): CardData {
  const { sections, theme, accent, title, links, ...rest } = json
  return {
    ...rest,
    name: rest.name.trim(),
    title: title?.trim() ?? '',
    theme: theme ?? 'auto',
    // Тот же вид цвета, что даёт парсер: #abc → #aabbcc
    accent: parseAccent(accent),
    links: links ?? [],
    sections: sections.map(section).filter((item) => item.type !== 'text' || item.content),
  }
}
