// Разметка для поисковиков и мессенджеров: JSON-LD Schema.org LocalBusiness, description, Open Graph.
import { contactLinks } from '../dsl/contactLinks'
import { parsePrice } from '../dsl/price'
import { profileOf } from '../dsl/profiles/index'
import { AMENITIES, type AmenityKey } from '../dsl/schema/amenities'
import type { CardData, CardSection } from '../types/card'


const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Профили в соцсетях и мессенджерах — для sameAs (звонок, почта и wa.me — не профили). */
const PROFILE_KINDS = ['telegram', 'vk', 'instagram', 'max', 'website']

const isAbsoluteUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url))

function sectionsOf<T extends CardSection['type']>(card: CardData, type: T): CardSection[] {
  return card.sections.filter((section) => section.type === type)
}

/** Сайт бизнеса, а не визитка человека: только для него LocalBusiness имеет смысл. */
export function isBusinessSite(card: CardData): boolean {
  return Boolean(
    card.business ||
      card.address ||
      card.sections.some((section) => ['services', 'hours', 'reviews', 'amenities', 'map', 'contacts'].includes(section.type)),
  )
}

function openingHours(card: CardData): object[] {
  return sectionsOf(card, 'hours')
    .flatMap((section) => section.hours ?? [])
    .filter((row) => !row.closed)
    .map((row) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: row.days.map((day) => `https://schema.org/${WEEKDAYS[day]}`),
      // Круглосуточно — 00:00–23:59; «24:00» Google советует писать как 23:59
      opens: row.allDay ? '00:00' : row.open,
      closes: row.allDay || row.close === '24:00' ? '23:59' : row.close,
    }))
}

function offerCatalog(card: CardData, currency: string): object | undefined {
  const services = sectionsOf(card, 'services').flatMap((section) => section.services ?? [])
  if (!services.length) return undefined

  return {
    '@type': 'OfferCatalog',
    name: sectionsOf(card, 'services')[0].title || 'Услуги',
    itemListElement: services.map((service) => {
      const price = service.price ? parsePrice(service.price) : null
      const offer: Record<string, unknown> = {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: service.title, ...(service.description ? { description: service.description } : {}) },
      }
      // Точная цена — price; «от 800» и «1500–2000» — диапазон в priceSpecification
      if (price && !price.atLeast && price.to === undefined) {
        Object.assign(offer, { price: String(price.from), priceCurrency: currency })
      } else if (price) {
        offer.priceSpecification = {
          '@type': 'PriceSpecification',
          minPrice: price.from,
          ...(price.to !== undefined ? { maxPrice: price.to } : {}),
          priceCurrency: currency,
        }
      }
      return offer
    }),
  }
}

/** Удобства → amenityFeature (LocationFeatureSpecification): название, value: true и уточнение как description. */
function amenityFeatures(card: CardData): Record<string, unknown> {
  const features = sectionsOf(card, 'amenities')
    .flatMap((section) => section.amenities ?? [])
    .map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: AMENITIES[amenity.key as AmenityKey]?.label ?? amenity.key,
      value: true,
      ...(amenity.text ? { description: amenity.text } : {}),
    }))
  return features.length ? { amenityFeature: features } : {}
}

function reviews(card: CardData): Record<string, unknown> {
  const list = sectionsOf(card, 'reviews').flatMap((section) => section.reviews ?? [])
  if (!list.length) return {}
  const rated = list.filter((review) => review.rating)

  return {
    review: list.map((review) => ({
      '@type': 'Review',
      ...(review.author ? { author: { '@type': 'Person', name: review.author } } : {}),
      reviewBody: review.text,
      ...(review.rating ? { reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 } } : {}),
    })),
    ...(rated.length
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round((rated.reduce((sum, review) => sum + review.rating!, 0) / rated.length) * 10) / 10,
            reviewCount: rated.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}

/** JSON-LD LocalBusiness из данных сайта; null — это не сайт бизнеса. */
export function localBusiness(card: CardData): Record<string, unknown> | null {
  if (!isBusinessSite(card)) return null
  const links = contactLinks(card).filter((link) => link.href)
  const phone = links.find((link) => link.kind === 'phone')
  const email = links.find((link) => link.kind === 'email')
  const sameAs = links.filter((link) => PROFILE_KINDS.includes(link.kind)).map((link) => link.href)
  const hours = openingHours(card)
  const catalog = offerCatalog(card, card.currency ?? 'RUB')

  return {
    '@context': 'https://schema.org',
    // Тип по профилю ниши (BarberShop в Schema.org нет — HairSalon; у репетитора и фотографа подходящего подтипа LocalBusiness нет)
    '@type': profileOf(card.business)?.schemaType ?? 'LocalBusiness',
    name: card.name,
    ...(siteDescription(card) ? { description: siteDescription(card) } : {}),
    ...(isAbsoluteUrl(card.avatar) ? { image: card.avatar } : {}),
    ...(phone ? { telephone: phone.href!.replace(/^tel:/, '') } : {}),
    ...(email ? { email: email.display } : {}),
    ...(card.address || card.city
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(card.address ? { streetAddress: card.address } : {}),
            ...(card.city ? { addressLocality: card.city } : {}),
            addressCountry: 'RU',
          },
        }
      : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(catalog ? { hasOfferCatalog: catalog } : {}),
    ...reviews(card),
    ...amenityFeatures(card),
    ...(profileOf(card.business)?.schemaExtra ?? {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

/** Убирает разметку Markdown для краткого описания. */
function plainText(markdown: string): string {
  return markdown
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`>|]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*{3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Краткое описание для поисковиков и превью ссылки: подзаголовок с городом или начало первого текста. */
export function siteDescription(card: CardData): string {
  const city = card.city && card.title && !card.title.includes(card.city) ? ` — ${card.city}` : ''
  if (card.title) return `${card.title}${city}`
  const text = card.sections.find((section) => section.type === 'text' && section.content)
  if (!text) return ''
  const plain = plainText(text.content)
  return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}…` : plain
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Теги для <head>: description, Open Graph и JSON-LD (если это сайт бизнеса). */
export function headTags(card: CardData): string {
  const description = siteDescription(card)
  const meta = (attr: 'name' | 'property', key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeAttribute(value)}" />`

  const tags = [
    ...(description ? [meta('name', 'description', description)] : []),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'ru_RU'),
    meta('property', 'og:title', card.name),
    ...(description ? [meta('property', 'og:description', description)] : []),
    ...(isAbsoluteUrl(card.avatar) ? [meta('property', 'og:image', card.avatar!)] : []),
  ]

  const jsonLd = localBusiness(card)
  if (jsonLd) {
    // «<» внутри JSON экранируем: строка «</script>» в данных не должна закрыть тег
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`)
  }
  return tags.join('\n  ')
}
