import { useMemo } from 'react'
import type {
  AccordionItem,
  CardGridItem,
  CardSection,
  CodeBlockData,
  TableData,
  ThemeColors,
} from '../../types/card'
import { TOKEN_COLORS, highlightCode } from '../../lib/highlight'
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
                {card.tags.map((tag) => (
                  <span
                    key={tag}
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

/** Рендерит тело секции в зависимости от её типа. */
export function SectionBody({ section, colors }: { section: CardSection; colors: ThemeColors }) {
  switch (section.type) {
    case 'table':
      return <TableBlock data={section.table ?? { headers: [], rows: [] }} colors={colors} />
    case 'accordion':
      return <AccordionBlock items={section.accordion ?? []} colors={colors} />
    case 'code-block':
      return <CodeBlockView data={section.code ?? { lang: '', code: section.content }} colors={colors} />
    case 'card-grid':
      return <CardGridBlock cards={section.cards ?? []} colors={colors} />
    default:
      return isSkillsSection(section.title) ? (
        <SkillsTags content={section.content} accent={colors.accent} />
      ) : (
        <SectionContent content={section.content} accent={colors.accent} />
      )
  }
}
