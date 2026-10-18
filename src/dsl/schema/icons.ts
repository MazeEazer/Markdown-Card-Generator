import { z } from 'zod'

/** Иконки для ссылок и карточек. SVG к каждой — в src/themes/shared/Icons.tsx (проверяется типом). */
export const ICONS = {
  github: 'GitHub',
  mail: 'почта',
  telegram: 'Telegram',
  link: 'ссылка (по умолчанию)',
  star: 'звезда',
  rocket: 'ракета',
  code: 'код',
  briefcase: 'портфель, работа',
  heart: 'сердце',
  globe: 'глобус, сайт',
  user: 'человек',
  zap: 'молния',
  phone: 'телефон',
  whatsapp: 'WhatsApp',
  vk: 'ВКонтакте',
  instagram: 'Instagram',
  max: 'MAX',
  'map-pin': 'метка на карте, адрес',
} as const

export type IconName = keyof typeof ICONS

export const ICON_NAMES = Object.keys(ICONS) as IconName[]

export const iconSchema = z.enum(ICON_NAMES).meta({
  description: `Иконка: ${ICON_NAMES.map((name) => `${name} — ${ICONS[name]}`).join(', ')}`,
  examples: ['star'],
})
