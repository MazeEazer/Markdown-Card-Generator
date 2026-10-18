// Ссылки на контакты бизнеса: владелец пишет номер и имя пользователя, ссылки строит генератор.
// Используется блоками сайта (:::contacts, кнопка «Записаться», панель связи) и разметкой Schema.org.
import type { CardData } from '../types/card.ts'
import { MAX_LINK, usernameFromLink } from './contacts.ts'
import { parseRussianPhone } from './phone.ts'
import type { ContactName } from './schema/frontmatter.ts'
import type { IconName } from './schema/icons.ts'

export type ContactKind = 'phone' | ContactName

export interface ContactLink {
  kind: ContactKind
  /** Название способа связи: «Telegram», «Телефон» */
  label: string
  /** Текст кнопки главного действия: «Позвонить», «Написать в Telegram» */
  action: string
  /** Как показать контакт: «+7 999 123-45-67», «@barber_ivan» */
  display: string
  /** Ссылка; null — значение записано так, что ссылку построить нельзя (валидатор об этом предупредит) */
  href: string | null
  icon: IconName
}

const META: Record<ContactKind, { label: string; action: string; icon: IconName }> = {
  phone: { label: 'Телефон', action: 'Позвонить', icon: 'phone' },
  telegram: { label: 'Telegram', action: 'Написать в Telegram', icon: 'telegram' },
  whatsapp: { label: 'WhatsApp', action: 'Написать в WhatsApp', icon: 'whatsapp' },
  max: { label: 'MAX', action: 'Написать в MAX', icon: 'max' },
  vk: { label: 'ВКонтакте', action: 'Написать ВКонтакте', icon: 'vk' },
  instagram: { label: 'Instagram', action: 'Написать в Instagram', icon: 'instagram' },
  email: { label: 'Почта', action: 'Написать на почту', icon: 'mail' },
  website: { label: 'Сайт', action: 'Перейти на сайт', icon: 'globe' },
}

/** Порядок на сайте: сначала звонок и мессенджеры, потом соцсети, почта и сайт. */
const ORDER: ContactKind[] = ['phone', 'telegram', 'whatsapp', 'max', 'vk', 'instagram', 'email', 'website']

/** Номер для ссылок: российский → +7XXXXXXXXXX, иностранный «+375 …» → как есть цифрами. */
function phoneDigits(value: string): { e164: string; display: string } | null {
  const russian = parseRussianPhone(value)
  if (russian) return russian
  if (/^\+[\d\s().-]+$/.test(value)) return { e164: `+${value.replace(/\D/g, '')}`, display: value }
  return null
}

/** Имя пользователя из имени, «@имени» или ссылки на профиль. */
function username(kind: ContactName, value: string): string | null {
  const name = usernameFromLink(kind, value) ?? value
  return /^[\w.]+$/.test(name) ? name : null
}

function build(kind: ContactKind, value: string): Pick<ContactLink, 'display' | 'href'> {
  switch (kind) {
    case 'phone': {
      const phone = phoneDigits(value)
      return phone ? { display: phone.display, href: `tel:${phone.e164}` } : { display: value, href: null }
    }
    case 'whatsapp': {
      const phone = phoneDigits(value)
      return phone ? { display: phone.display, href: `https://wa.me/${phone.e164.slice(1)}` } : { display: value, href: null }
    }
    case 'telegram': {
      const name = username(kind, value)
      return name ? { display: `@${name}`, href: `https://t.me/${name}` } : { display: value, href: null }
    }
    case 'vk': {
      const name = username(kind, value)
      return name ? { display: `vk.com/${name}`, href: `https://vk.com/${name}` } : { display: value, href: null }
    }
    case 'instagram': {
      const name = username(kind, value)
      return name ? { display: `@${name}`, href: `https://instagram.com/${name}` } : { display: value, href: null }
    }
    case 'max':
      return MAX_LINK.test(value) ? { display: 'Профиль в MAX', href: value } : { display: value, href: null }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { display: value, href: `mailto:${value}` } : { display: value, href: null }
    case 'website': {
      const href = /^https?:\/\//i.test(value) ? value : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) ? `https://${value}` : null
      return { display: value.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), href }
    }
  }
}

/** Все указанные контакты бизнеса в порядке показа на сайте. */
export function contactLinks(card: Pick<CardData, 'phone' | 'contacts'>): ContactLink[] {
  const values: Partial<Record<ContactKind, string>> = { ...card.contacts, phone: card.phone }
  return ORDER.flatMap((kind) => {
    const value = values[kind]?.trim()
    return value ? [{ kind, ...META[kind], ...build(kind, value) }] : []
  })
}

/**
 * Главный способ связи — для кнопок «Записаться / Связаться»: `contacts.primary`,
 * иначе телефон, иначе первый контакт, по которому можно перейти. null — связаться не по чему.
 */
export function primaryLink(card: Pick<CardData, 'phone' | 'contacts'>): ContactLink | null {
  const links = contactLinks(card).filter((link) => link.href)
  const primary = card.contacts?.primary
  return links.find((link) => link.kind === primary) ?? links.find((link) => link.kind === 'phone') ?? links[0] ?? null
}
