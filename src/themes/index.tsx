import type { ComponentType } from 'react'
import type { ThemeName } from '../types/card'
import { GlassTheme } from './Glass'
import { MinimalTheme } from './Minimal'
import { NoirTheme } from './Noir'
import { VercelTheme } from './Vercel'
import type { ThemeProps } from './shared/ThemeParts'

export const THEMES: Record<ThemeName, ComponentType<ThemeProps>> = {
  glass: GlassTheme,
  minimal: MinimalTheme,
  noir: NoirTheme,
  vercel: VercelTheme,
}

export { GlassTheme, MinimalTheme, NoirTheme, VercelTheme }
export type { ThemeProps }
