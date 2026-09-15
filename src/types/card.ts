export type ThemeName = 'glass' | 'minimal' | 'noir' | 'vercel'

export interface CardLink {
  label: string
  url: string
  icon?: string
}

export type SectionType = 'text' | 'table' | 'accordion' | 'code-block' | 'card-grid'

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
