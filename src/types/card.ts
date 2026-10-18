export type ThemeName = 'glass' | 'minimal' | 'noir' | 'vercel'

export interface CardLink {
  label: string
  url: string
  icon?: string
}

export type SectionType = 'text' | 'table' | 'accordion' | 'code-block' | 'card-grid' | 'contacts' | 'services' | 'hours' | 'reviews' | 'map'

export interface TableData {
  headers: string[]
  rows: string[][]
}

export interface AccordionItem {
  title: string
  content: string
}

export interface CodeBlockData {
  lang: string
  code: string
}

/** Строка часов работы из блока :::hours */
export interface HoursRow {
  /** Дни недели: 0 — понедельник … 6 — воскресенье */
  days: number[]
  /** «10:00» — с ведущим нулём, как в Schema.org */
  open?: string
  /** «20:00»; «24:00» — до полуночи */
  close?: string
  closed?: boolean
  allDay?: boolean
}

/** Отзыв из блока :::reviews */
export interface ReviewItem {
  author: string
  text: string
  /** 1–5; неправильная запись оценки не попадает сюда (валидатор предложит исправить) */
  rating?: number
  /** Как написал владелец: «март 2026» */
  date?: string
}

/** Услуга из блока :::services */
export interface ServiceItem {
  title: string
  /** Как написал владелец: «1500», «от 1500», «1500–2000», «бесплатно» */
  price?: string
  /** «60 мин», «1 ч 30 мин» */
  duration?: string
  description?: string
}

export interface CardGridItem {
  title: string
  description: string
  icon?: string
  /** Ссылка на проект — карточка становится кликабельной */
  url?: string
  /** Теги/стек проекта */
  tags?: string[]
}

export interface CardSection {
  title: string
  content: string
  /** Тип секции — определяется автоматически по содержимому */
  type: SectionType
  /** Заполняется при type: 'table' */
  table?: TableData
  /** Заполняется при type: 'accordion' */
  accordion?: AccordionItem[]
  /** Заполняется при type: 'code-block' */
  code?: CodeBlockData
  /** Заполняется при type: 'card-grid' */
  cards?: CardGridItem[]
  /** Заполняется при type: 'services' */
  services?: ServiceItem[]
  /** Заполняется при type: 'hours' */
  hours?: HoursRow[]
  /** Заполняется при type: 'reviews' */
  reviews?: ReviewItem[]
  /** Заполняется при type: 'map': свой адрес блока; без него — адрес из шапки */
  map?: { address?: string }
}

/** Контакты бизнеса: имена пользователей и номера, ссылки строит генератор. */
export interface CardContacts {
  telegram?: string
  whatsapp?: string
  vk?: string
  max?: string
  instagram?: string
  email?: string
  website?: string
  /** Куда ведёт главная кнопка «Записаться / Связаться» — имя одного из контактов или phone */
  primary?: string
}

export interface CardData {
  name: string
  title: string
  theme: ThemeName | 'auto'
  accent: string | 'auto'
  avatar?: string
  location?: string
  links: CardLink[]
  sections: CardSection[]
  /** Поля бизнеса (этап 2): читаются парсером, на сайте появятся в этапе 3 */
  business?: string
  phone?: string
  address?: string
  city?: string
  currency?: string
  contacts?: CardContacts
}

export interface ThemeColors {
  accent: string
  accentLight: string
  accentDark: string
  background: string
  surface: string
  text: string
  textMuted: string
}

export interface ResolvedTheme {
  theme: ThemeName
  colors: ThemeColors
}

export interface ParseResult {
  data: CardData | null
  error: string | null
}
