import { z } from 'zod'
import type { CardContacts, ThemeName } from '../../types/card.ts'
import { iconSchema } from './icons.ts'
import { placeholder } from './placeholder.ts'

// Поля шапки документа (YAML между строками ---). Описания идут в подсказки редактора и в промпт для нейросети.

export const THEMES = {
  glass: 'стекло: полупрозрачные карточки на цветном фоне',
  minimal: 'минимализм: светлый фон, много воздуха',
  noir: 'тёмная, контрастная',
  vercel: 'строгая чёрно-белая, технологичная',
} as const satisfies Record<ThemeName, string>

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

export const BUSINESSES = {
  barbershop: 'барбершоп, парикмахерская',
  tutor: 'репетитор, преподаватель',
  nails: 'мастер маникюра',
  photographer: 'фотограф',
  other: 'другое',
} as const

export type BusinessName = keyof typeof BUSINESSES

export const BUSINESS_NAMES = Object.keys(BUSINESSES) as BusinessName[]

/** Способы связи в `contacts` (кроме `primary`). */
export const CONTACTS = {
  telegram: 'имя пользователя в Telegram, без @ и ссылки',
  whatsapp: 'номер телефона, привязанный к WhatsApp',
  vk: 'короткое имя страницы ВКонтакте',
  max: 'ссылка на профиль в MAX: в приложении откройте профиль → значок QR-кода → «Поделиться»',
  instagram: 'имя пользователя в Instagram',
  email: 'адрес электронной почты',
  website: 'ссылка на другой сайт',
} as const satisfies Record<Exclude<keyof CardContacts, 'primary'>, string>

export type ContactName = keyof typeof CONTACTS

export const CONTACT_NAMES = Object.keys(CONTACTS) as ContactName[]

/** Привычные названия мессенджеров и соцсетей → ключи contacts (и phone — для primary). */
export const CONTACT_ALIASES: Record<string, string> = {
  tg: 'telegram',
  телеграм: 'telegram',
  телеграмм: 'telegram',
  телега: 'telegram',
  wa: 'whatsapp',
  whatsup: 'whatsapp',
  ватсап: 'whatsapp',
  вотсап: 'whatsapp',
  вацап: 'whatsapp',
  вк: 'vk',
  vkontakte: 'vk',
  вконтакте: 'vk',
  макс: 'max',
  insta: 'instagram',
  инстаграм: 'instagram',
  инста: 'instagram',
  mail: 'email',
  'e-mail': 'email',
  почта: 'email',
  site: 'website',
  сайт: 'website',
  телефон: 'phone',
}

/** Куда может вести главная кнопка: любой контакт или телефон из шапки. */
export const PRIMARY_TARGETS = [...CONTACT_NAMES, 'phone'] as const

const text = (description: string, example: string) => z.string().meta({ description, examples: [example] })
/**
 * Контакт или адрес: правдоподобный пример — для редактора, а в промпт и JSON Schema идёт заглушка promptExample
 * (как в шаблонах): нейросеть переносила номер из примера в сайт, где контактов в описании не было.
 */
const contact = (description: string, example: string, promptExample: string) =>
  z.string().meta({ description, examples: [example], promptExample })
/** Свободный текст: пример — для редактора, в промпт не попадает (как prose в blocks.ts). */
const prose = (description: string, example: string) => z.string().meta({ description, examples: [example], prose: true })

const linkSchema = z
  .strictObject({
    label: text('Подпись ссылки', 'Telegram'),
    url: contact('Адрес ссылки', 'https://t.me/barber_ivan', 'https://t.me/vash_telegram'),
    icon: iconSchema.optional(),
  })
  .meta({ description: 'Ссылка в шапке сайта' })

export const contactsSchema = z
  .strictObject({
    telegram: contact(CONTACTS.telegram, 'barber_ivan', 'vash_telegram').optional(),
    whatsapp: contact(CONTACTS.whatsapp, '+7 999 123-45-67', '+7 900 000-00-00').optional(),
    vk: contact(CONTACTS.vk, 'barber_samara', 'vasha_stranica').optional(),
    max: contact(CONTACTS.max, 'https://max.ru/u/f9LHodD0cOKGmHmt', 'https://max.ru/u/vash_profil').optional(),
    instagram: contact(CONTACTS.instagram, 'barber.ivan', 'vash.instagram').optional(),
    email: z.email().meta({ description: CONTACTS.email, examples: ['hello@example.ru'] }).optional(),
    website: z.url().meta({ description: CONTACTS.website, examples: ['https://example.ru'] }).optional(),
    primary: z
      .enum(PRIMARY_TARGETS)
      .meta({
        description: 'Куда ведёт главная кнопка «Записаться / Связаться»: один из указанных контактов или phone',
        examples: ['telegram'],
      })
      .optional(),
  })
  .meta({ description: 'Мессенджеры и соцсети: имена пользователей и номера, ссылки сайт строит сам' })

export const frontmatterSchema = z
  .strictObject({
    name: text('Название бизнеса или имя мастера — главный заголовок сайта', 'Барбершоп «Борода»'),
    title: prose('Короткое описание под названием', 'Мужские стрижки и уход за бородой').optional(),
    theme: z
      .enum([...THEME_NAMES, 'auto'])
      .meta({
        description: `Оформление сайта: ${THEME_NAMES.map((name) => `${name} — ${THEMES[name]}`).join('; ')}; auto — подобрать автоматически`,
        examples: ['noir'],
      })
      .optional(),
    accent: z
      .string()
      .regex(/^(auto|#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?)$/)
      .meta({ description: 'Основной цвет в формате "#rrggbb" (в кавычках!) или auto', examples: ['#c0392b'] })
      .optional(),
    avatar: z.url().meta({ description: 'Ссылка на фото или логотип', examples: ['https://example.ru/logo.png'] }).optional(),
    location: z
      .string()
      .meta({ description: 'Город или район одной строкой (устаревшее, лучше address и city)', deprecated: true })
      .optional(),
    links: z.array(linkSchema).meta({ description: 'Дополнительные ссылки в шапке сайта' }).optional(),
    business: z
      .enum(BUSINESS_NAMES)
      .meta({
        description: `Вид бизнеса: ${BUSINESS_NAMES.map((name) => `${name} — ${BUSINESSES[name]}`).join(', ')}`,
        examples: ['barbershop'],
      })
      .optional(),
    phone: contact('Телефон для звонков', '+7 999 123-45-67', '+7 900 000-00-00').optional(),
    // В промпте — заглушки: пример «ул. Ленина, 10» модель переносила в сайт без адреса («ул. Ленина, 15»)
    address: contact('Адрес без города: улица, дом', 'ул. Ленина, 10', placeholder('улица и дом')).optional(),
    city: contact('Город', 'Самара', placeholder('город')).optional(),
    currency: z
      .enum(['RUB'])
      .meta({ description: 'Валюта цен; по умолчанию RUB — рубли', examples: ['RUB'] })
      .optional(),
    contacts: contactsSchema.optional(),
  })
  .meta({ description: 'Шапка документа между строками ---' })

export type Frontmatter = z.infer<typeof frontmatterSchema>

/** Поля шапки по-русски → ключи схемы: владелец бизнеса может написать «телефон:» вместо «phone:». */
export const FRONTMATTER_ALIASES: Record<string, string> = {
  имя: 'name',
  название: 'name',
  описание: 'title',
  подзаголовок: 'title',
  тема: 'theme',
  цвет: 'accent',
  фото: 'avatar',
  логотип: 'avatar',
  ссылки: 'links',
  бизнес: 'business',
  телефон: 'phone',
  адрес: 'address',
  город: 'city',
  валюта: 'currency',
  контакты: 'contacts',
}

/** Пример шапки — для справки в редакторе и промпта. */
export const FRONTMATTER_EXAMPLE = `---
name: Барбершоп «Борода»
title: ${placeholder('чем занимаетесь, коротко')}
theme: noir
accent: "#c0392b"
business: barbershop
phone: +7 900 000-00-00
address: ${placeholder('улица и дом')}
city: ${placeholder('город')}
currency: RUB
contacts:
  telegram: vash_telegram
  whatsapp: +7 900 000-00-00
  primary: telegram
---`
