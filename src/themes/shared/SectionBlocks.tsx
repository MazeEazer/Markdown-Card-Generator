import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type {
  AccordionItem,
  AmenityItem,
  CardData,
  CardGridItem,
  CardSection,
  CodeBlockData,
  HoursRow,
  ReviewItem,
  ServiceItem,
  TableData,
  ThemeColors,
} from '../../types/card'
import { contactLinks, primaryLink, type ContactLink } from '../../dsl/contactLinks'
import { formatDays, formatHoursTime, hoursStatus } from '../../dsl/hours'
import { mapLinks, mapQuery } from '../../dsl/mapLinks'
import { formatPrice } from '../../dsl/price'
import { TOKEN_COLORS, highlightCode } from '../../lib/highlight'
import { AMENITIES, type AmenityKey } from '../../dsl/schema/amenities'
import { AmenityIcon } from './AmenityIcons'
import { Icon } from './Icons'
import { SectionContent, SkillsTags, isMonochromeAccent, isSkillsSection } from './ThemeParts'

/* ---------------------------------------------------------------------------
 * Дополнительные типы секций: table / accordion / code-block / card-grid.
 * Блоки используют inline-стили, поэтому одинаково выглядят и в live-превью,
 * и в экспортированном автономном HTML (без внешнего CSS).
 * ------------------------------------------------------------------------- */

export function TableBlock({ data, colors }: { data: TableData; colors: ThemeColors }) {
  const { headers, rows } = data
  if (!headers.length && !rows.length) return null

  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${colors.accent}33`, borderRadius: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', lineHeight: 1.5 }}>
        {headers.length > 0 && (
          <thead>
            <tr style={{ background: `${colors.accent}18` }}>
              {headers.map((header, i) => (
                <th
                  key={i}
                  style={{
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: colors.accent,
                    borderBottom: `1px solid ${colors.accent}33`,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    padding: '0.5rem 0.75rem',
                    verticalAlign: 'top',
                    borderBottom: rowIndex === rows.length - 1 ? 'none' : `1px solid ${colors.textMuted}22`,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AccordionBlock({ items, colors }: { items: AccordionItem[]; colors: ThemeColors }) {
  if (!items.length) return null

  return (
    <div className="md-accordion" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <details
          key={i}
          style={{
            background: `${colors.accent}0f`,
            border: `1px solid ${colors.accent}26`,
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <summary
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: colors.accent,
            }}
          >
            <span className="md-accordion-caret" aria-hidden="true">
              ▸
            </span>
            <span>{item.title}</span>
          </summary>
          <div style={{ padding: '0 0.85rem 0.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            <SectionContent content={item.content} accent={colors.accent} />
          </div>
        </details>
      ))}
    </div>
  )
}

export function CodeBlockView({ data, colors }: { data: CodeBlockData; colors: ThemeColors }) {
  const tokens = useMemo(() => highlightCode(data.code, data.lang), [data.code, data.lang])
  // в монохромной теме «светофоры» кодового блока тоже нейтральные
  const dots = isMonochromeAccent(colors.accent)
    ? ['#3f3f3f', '#525252', '#6f6f6f']
    : ['#ff5f56', '#ffbd2e', '#27c93f']

  return (
    <div
      style={{
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: `1px solid ${colors.accent}33`,
        background: '#0d0d0d',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            color: colors.accent,
          }}
        >
          {data.lang || 'code'}
        </span>
        <span style={{ display: 'flex', gap: '0.3rem' }} aria-hidden="true">
          {dots.map((dot) => (
            <span key={dot} style={{ width: 9, height: 9, borderRadius: '9999px', background: dot }} />
          ))}
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '0.9rem 1rem',
          overflowX: 'auto',
          whiteSpace: 'pre',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', monospace",
          color: TOKEN_COLORS.plain,
        }}
      >
        <code>{tokens.map((token, i) => (
          <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
            {token.text}
          </span>
        ))}</code>
      </pre>
    </div>
  )
}

/** Короткий читаемый адрес ссылки: github.com/user/repo */
function prettyUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.host.replace(/^www\./, '')}${path}`
  } catch {
    return url
  }
}

export function CardGridBlock({ cards, colors }: { cards: CardGridItem[]; colors: ThemeColors }) {
  if (!cards.length) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
      {cards.map((card, i) => {
        const boxStyle = {
          display: 'block',
          padding: '1rem',
          borderRadius: '0.75rem',
          background: `${colors.accent}0f`,
          border: `1px solid ${colors.accent}26`,
        }

        const body = (
          <>
            {card.icon && (
              <div style={{ marginBottom: '0.6rem', lineHeight: 0 }}>
                <Icon icon={card.icon} color={colors.accent} size={22} />
              </div>
            )}

            {(card.title || card.url) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: card.description || card.tags?.length ? '0.35rem' : 0,
                }}
              >
                {card.title && <span style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3 }}>{card.title}</span>}
                {card.url && (
                  <span aria-hidden="true" style={{ fontSize: '0.85rem', lineHeight: 1, color: colors.accent }}>
                    ↗
                  </span>
                )}
              </div>
            )}

            {card.description && (
              <div
                style={{
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  color: colors.textMuted,
                  marginBottom: card.tags?.length || card.url ? '0.6rem' : 0,
                }}
              >
                {card.description}
              </div>
            )}

            {card.tags && card.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: card.url ? '0.6rem' : 0 }}>
                {card.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      whiteSpace: 'nowrap',
                      background: `${colors.accent}18`,
                      color: colors.accent,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {card.url && (
              <div
                style={{
                  fontSize: '0.7rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {prettyUrl(card.url)}
              </div>
            )}
          </>
        )

        // Карточка со ссылкой целиком кликабельна
        return card.url ? (
          <a
            key={i}
            className="md-card"
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...boxStyle, color: 'inherit', textDecoration: 'none' }}
          >
            {body}
          </a>
        ) : (
          <div key={i} style={boxStyle}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** Ссылка на контакт: http(s) — в новой вкладке, tel: и mailto: — в приложении телефона. */
function ContactAnchor({ link, style, children }: { link: ContactLink; style: CSSProperties; children: ReactNode }) {
  if (!link.href) return <div style={style}>{children}</div>
  const external = /^https?:/.test(link.href)
  return (
    <a
      className="md-card"
      href={link.href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{ ...style, color: 'inherit', textDecoration: 'none' }}
    >
      {children}
    </a>
  )
}

/** Блок :::contacts — телефон, адрес и мессенджеры из шапки. */
export function ContactsBlock({ card, colors }: { card: CardData; colors: ThemeColors }) {
  const links = contactLinks(card)
  const phone = links.find((link) => link.kind === 'phone')
  const others = links.filter((link) => link.kind !== 'phone')
  const address = [card.city, card.address].filter(Boolean).join(', ')
  if (!links.length && !address) return null

  const box: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    background: `${colors.accent}0f`,
    border: `1px solid ${colors.accent}26`,
  }
  const muted: CSSProperties = { fontSize: '0.8rem', lineHeight: 1.4, color: colors.textMuted }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {phone && (
        <ContactAnchor link={phone} style={box}>
          <Icon icon={phone.icon} color={colors.accent} size={22} />
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3, color: colors.text }}>{phone.display}</div>
            <div style={muted}>{phone.href ? phone.action : phone.label}</div>
          </div>
        </ContactAnchor>
      )}

      {address && (
        <div style={{ ...box, background: 'transparent' }}>
          <Icon icon="map-pin" color={colors.accent} size={22} />
          <div style={{ fontSize: '0.95rem', lineHeight: 1.4, color: colors.text }}>{address}</div>
        </div>
      )}

      {others.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {others.map((link) => (
            <ContactAnchor key={link.kind} link={link} style={box}>
              <Icon icon={link.icon} color={colors.accent} size={20} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3, color: colors.text }}>{link.label}</div>
                <div style={{ ...muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.display}</div>
              </div>
            </ContactAnchor>
          ))}
        </div>
      )}
    </div>
  )
}

/** Блок :::services — услуги с ценой и кнопкой «Записаться» на главный контакт. */
export function ServicesBlock({ services, card, colors }: { services: ServiceItem[]; card: CardData; colors: ThemeColors }) {
  if (!services.length) return null
  const contact = primaryLink(card)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {services.map((service, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem 1rem',
            padding: '1rem',
            borderRadius: '0.75rem',
            background: `${colors.accent}0f`,
            border: `1px solid ${colors.accent}26`,
          }}
        >
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3, color: colors.text }}>{service.title}</div>
            {service.duration && (
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: colors.textMuted }}>{service.duration}</div>
            )}
            {service.description && (
              <div style={{ fontSize: '0.85rem', lineHeight: 1.5, marginTop: '0.4rem', color: colors.textMuted }}>
                {service.description}
              </div>
            )}
          </div>

          {/* marginLeft: auto — на узком экране колонка переносится на новую строку и остаётся справа */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginLeft: 'auto' }}>
            {service.price && (
              <div style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', color: colors.accent }}>
                {formatPrice(service.price, card.currency)}
              </div>
            )}
            {contact?.href && (
              <a
                className="md-card"
                href={contact.href}
                title={contact.action}
                {...(/^https?:/.test(contact.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  color: colors.accent,
                  border: `1.5px solid ${colors.accent}`,
                }}
              >
                Записаться
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** День недели (0 — понедельник) и минуты от полуночи по часам посетителя. */
function weekTime(date: Date): { weekday: number; minutes: number } {
  return { weekday: (date.getDay() + 6) % 7, minutes: date.getHours() * 60 + date.getMinutes() }
}

/**
 * Блок :::hours — часы по дням и бейдж «Открыто до 20:00». В превью статус пересчитывается раз в минуту;
 * в экспортированном HTML его пересчитывает встроенный скрипт (src/lib/hoursScript.ts) по атрибутам data-md-*.
 */
export function HoursBlock({ hours, colors }: { hours: HoursRow[]; colors: ThemeColors }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  if (!hours.length) return null

  const { weekday, minutes } = weekTime(now)
  const status = hoursStatus(hours, weekday, minutes)
  const badgeColor = status.open ? colors.accent : colors.textMuted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <span
        data-md-hours={JSON.stringify(hours)}
        data-open-color={colors.accent}
        data-closed-color={colors.textMuted}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: badgeColor,
          background: `${badgeColor}18`,
          border: `1px solid ${badgeColor}44`,
        }}
      >
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '9999px', background: 'currentColor' }} />
        <span data-md-hours-text="">{status.text}</span>
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {hours.map((row, i) => {
          const today = row.days.includes(weekday)
          const style: CSSProperties = { fontWeight: today ? 600 : 400, color: today ? colors.text : colors.textMuted }
          const days = formatDays(row.days)
          const attrs = { 'data-md-days': row.days.join(','), 'data-color': colors.textMuted, 'data-today-color': colors.text }
          return [
            <span key={`d${i}`} {...attrs} style={style}>
              {days.charAt(0).toUpperCase() + days.slice(1)}
            </span>,
            <span key={`t${i}`} {...attrs} style={{ ...style, fontVariantNumeric: 'tabular-nums' }}>
              {formatHoursTime(row)}
            </span>,
          ]
        })}
      </div>
    </div>
  )
}

/** «1 отзыв», «3 отзыва», «5 отзывов». */
function reviewsCount(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'отзыв' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'отзыва' : 'отзывов'
  return `${count} ${word}`
}

function Stars({ rating, colors, size = '0.95rem' }: { rating: number; colors: ThemeColors; size?: string }) {
  return (
    <span aria-label={`Оценка ${rating} из 5`} style={{ fontSize: size, letterSpacing: '0.1em', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ color: star <= Math.round(rating) ? colors.accent : `${colors.textMuted}55` }}>
          ★
        </span>
      ))}
    </span>
  )
}

/** Блок :::reviews — средняя оценка и карточки отзывов со звёздами. */
export function ReviewsBlock({ reviews, colors }: { reviews: ReviewItem[]; colors: ThemeColors }) {
  if (!reviews.length) return null
  const rated = reviews.filter((review) => review.rating)
  const average = rated.length ? rated.reduce((sum, review) => sum + review.rating!, 0) / rated.length : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {average !== null && reviews.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>{average.toFixed(1).replace('.', ',')}</span>
          <Stars rating={average} colors={colors} size="1.1rem" />
          <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{reviewsCount(reviews.length)}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {reviews.map((review, i) => (
          <figure
            key={i}
            style={{
              margin: 0,
              padding: '1rem',
              borderRadius: '0.75rem',
              background: `${colors.accent}0f`,
              border: `1px solid ${colors.accent}26`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {review.rating && <Stars rating={review.rating} colors={colors} />}
            <blockquote style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: colors.text }}>«{review.text}»</blockquote>
            <figcaption style={{ fontSize: '0.8rem', color: colors.textMuted }}>
              <span style={{ fontWeight: 600 }}>{review.author}</span>
              {review.date && <span> · {review.date}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

/** Блок :::amenities — удобства: иконка, название (по умолчанию из списка) и необязательное уточнение. */
export function AmenitiesBlock({ amenities, colors }: { amenities: AmenityItem[]; colors: ThemeColors }) {
  if (!amenities.length) return null

  return (
    <ul
      className="md-amenities"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.6rem' }}
    >
      {amenities.map((amenity, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            padding: '0.7rem 0.9rem',
            borderRadius: '0.75rem',
            background: `${colors.accent}0f`,
            border: `1px solid ${colors.accent}26`,
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>
            <AmenityIcon amenity={amenity.key} color={colors.accent} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>{AMENITIES[amenity.key as AmenityKey]?.label ?? amenity.key}</span>
            {amenity.text && <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{amenity.text}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Блок :::map — карта Яндекса по адресу (загружается лениво) и кнопки «Яндекс Карты» / «2ГИС». */
export function MapBlock({ address, card, colors }: { address?: string; card: CardData; colors: ThemeColors }) {
  const query = mapQuery(card, address)
  if (!query) return null
  const links = mapLinks(query)
  const button: CSSProperties = {
    padding: '0.4rem 0.9rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
    color: colors.accent,
    border: `1.5px solid ${colors.accent}`,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: colors.text }}>
        <Icon icon="map-pin" color={colors.accent} size={20} />
        {query}
      </div>
      <iframe
        src={links.widget}
        title={`Карта: ${query}`}
        loading="lazy"
        style={{ width: '100%', height: 300, border: `1px solid ${colors.accent}26`, borderRadius: '0.75rem', display: 'block' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <a className="md-card" href={links.yandex} target="_blank" rel="noopener noreferrer" style={button}>
          Яндекс Карты
        </a>
        <a className="md-card" href={links.twoGis} target="_blank" rel="noopener noreferrer" style={button}>
          2ГИС
        </a>
      </div>
    </div>
  )
}

/** Рендерит тело секции в зависимости от её типа. Данные сайта (card) нужны блокам, которые показывают контакты. */
export function SectionBody({ section, card, colors }: { section: CardSection; card: CardData; colors: ThemeColors }) {
  switch (section.type) {
    case 'table':
      return <TableBlock data={section.table ?? { headers: [], rows: [] }} colors={colors} />
    case 'accordion':
      return <AccordionBlock items={section.accordion ?? []} colors={colors} />
    case 'code-block':
      return <CodeBlockView data={section.code ?? { lang: '', code: section.content }} colors={colors} />
    case 'card-grid':
      return <CardGridBlock cards={section.cards ?? []} colors={colors} />
    case 'contacts':
      return <ContactsBlock card={card} colors={colors} />
    case 'hours':
      return <HoursBlock hours={section.hours ?? []} colors={colors} />
    case 'reviews':
      return <ReviewsBlock reviews={section.reviews ?? []} colors={colors} />
    case 'amenities':
      return <AmenitiesBlock amenities={section.amenities ?? []} colors={colors} />
    case 'map':
      return <MapBlock address={section.map?.address} card={card} colors={colors} />
    case 'services':
      return <ServicesBlock services={section.services ?? []} card={card} colors={colors} />
    default:
      return isSkillsSection(section.title) ? (
        <SkillsTags content={section.content} accent={colors.accent} />
      ) : (
        <SectionContent content={section.content} accent={colors.accent} />
      )
  }
}
