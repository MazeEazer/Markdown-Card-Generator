export type ThemeName = 'glass' | 'minimal' | 'noir'

export interface CardLink {
  label: string
  url: string
  icon?: string
}

export interface CardSection {
  title: string
  content: string
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
