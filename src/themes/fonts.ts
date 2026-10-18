import type { ThemeName } from '../types/card'

/** Основной шрифт каждой темы — у корня темы и у панели связи (она стоит вне темы, см. Site.tsx). */
export const THEME_FONTS: Record<ThemeName, string> = {
  glass: "'Inter', sans-serif",
  minimal: "'Inter', sans-serif",
  noir: "'JetBrains Mono', monospace",
  vercel: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
}
