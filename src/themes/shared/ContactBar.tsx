import type { CSSProperties } from 'react'
import { contactLinks, type ContactKind } from '../../dsl/contactLinks'
import type { CardData, ThemeColors } from '../../types/card'
import { readableOn } from './colors'
import { Icon } from './Icons'

/** Способы связи для кнопок внизу экрана: звонок и мессенджеры (почта и сайт — не «быстрая связь»). */
const BAR_KINDS: ContactKind[] = ['phone', 'telegram', 'whatsapp', 'max', 'vk']

const SHORT_LABEL: Partial<Record<ContactKind, string>> = { phone: 'Позвонить' }

/** Сплошной фон панели: у Glass фон темы — полупрозрачный градиент, сквозь него просвечивал бы сайт. */
function barBackground(colors: ThemeColors): string {
  return /gradient|rgba/.test(colors.background) ? 'rgba(255, 255, 255, 0.92)' : colors.background
}

/**
 * Панель связи на телефоне: до трёх кнопок, главный контакт (contacts.primary) — первым и залитым.
 * Видна только на узком экране — правило @container md-site в CSS (index.css и cardStyles.ts),
 * поэтому работает и в узком превью редактора, и на опубликованном сайте.
 */
export function ContactBar({ card, colors, font }: { card: CardData; colors: ThemeColors; font: string }) {
  const primary = card.contacts?.primary
  const links = contactLinks(card)
    .filter((link) => link.href && BAR_KINDS.includes(link.kind))
    .sort((a, b) => Number(b.kind === primary) - Number(a.kind === primary))
    .slice(0, 3)
  if (!links.length) return null

  return (
    <nav
      className="md-contact-bar"
      aria-label="Связаться"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        gap: '0.5rem',
        padding: '0.6rem 0.75rem max(0.6rem, env(safe-area-inset-bottom))',
        fontFamily: font,
        background: barBackground(colors),
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.accent}33`,
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
      }}
    >
      {links.map((link, i) => {
        const filled = i === 0
        const style: CSSProperties = {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          minWidth: 0,
          padding: '0.65rem 0.5rem',
          borderRadius: '0.75rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          color: filled ? readableOn(colors.accent) : colors.accent,
          background: filled ? colors.accent : 'transparent',
          border: `1.5px solid ${colors.accent}`,
        }
        return (
          <a
            key={link.kind}
            href={link.href!}
            title={link.action}
            {...(/^https?:/.test(link.href!) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            style={style}
          >
            <Icon icon={link.icon} color={filled ? readableOn(colors.accent) : colors.accent} size={18} />
            {SHORT_LABEL[link.kind] ?? link.label}
          </a>
        )
      })}
    </nav>
  )
}
