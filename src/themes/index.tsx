import type { ComponentType } from 'react'
import type { ThemeName } from '../types/card'
import { GlassTheme } from './Glass'
import { MinimalTheme } from './Minimal'
import { NoirTheme } from './Noir'
import type { ThemeProps } from './shared/ThemeParts'

export const THEMES: Record<ThemeName, ComponentType<ThemeProps>> = {
  glass: GlassTheme,
  minimal: MinimalTheme,
  noir: NoirTheme,
}

export { GlassTheme, MinimalTheme, NoirTheme }
export type { ThemeProps }
