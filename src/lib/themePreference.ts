import { THEME_NAMES } from '../dsl/schema/frontmatter'
import type { ThemeName } from '../types/card'

/** Значение селектора темы в редакторе: конкретная тема либо автоматический выбор. */
export type ThemePreference = ThemeName | 'auto'

const SITE_THEME_PREFIX = 'md-card:theme:'
const LAST_THEME_KEY = 'md-card:theme:last'

const THEME_PREFERENCES: ThemePreference[] = ['auto', ...THEME_NAMES]

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as string[]).includes(value)
}

/**
 * Тема, сохранённая локально для конкретного сайта (без глобального фолбэка).
 */
export function readSiteTheme(siteId: string | null | undefined): ThemePreference | null {
  if (!siteId) return null
  try {
    const value = localStorage.getItem(SITE_THEME_PREFIX + siteId)
    return isThemePreference(value) ? value : null
  } catch {
    // localStorage может быть недоступен (приватный режим) — тихо игнорируем
    return null
  }
}

/** Последняя использованная тема (любой сайт). */
export function readLastTheme(): ThemePreference | null {
  try {
    const value = localStorage.getItem(LAST_THEME_KEY)
    return isThemePreference(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Тема, сохранённая локально: сначала для конкретного сайта,
 * затем — последняя использованная.
 */
export function readStoredTheme(siteId: string | null | undefined): ThemePreference | null {
  return readSiteTheme(siteId) ?? readLastTheme()
}

/** Запоминает выбранную тему для сайта и как «последнюю использованную». */
export function persistTheme(siteId: string | null | undefined, theme: ThemePreference): void {
  try {
    localStorage.setItem(LAST_THEME_KEY, theme)
    if (siteId) localStorage.setItem(SITE_THEME_PREFIX + siteId, theme)
  } catch {
    // нет доступа к localStorage — не критично, тема останется в состоянии приложения
  }
}

/**
 * Тема при открытии сайта:
 * 1. локальный выбор для этого сайта (в т.ч. ещё не сохранённый в БД),
 * 2. значение из базы,
 * 3. последняя использованная тема,
 * 4. 'auto'.
 */
export function resolveInitialTheme(
  siteId: string | null | undefined,
  savedTheme: string | null | undefined,
): ThemePreference {
  return readSiteTheme(siteId) ?? (isThemePreference(savedTheme) ? savedTheme : readLastTheme() ?? 'auto')
}
