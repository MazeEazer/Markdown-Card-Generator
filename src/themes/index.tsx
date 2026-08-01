import type { ComponentType } from 'react'
import type { ThemeName } from '../types/card'
import { AuroraTheme } from './Aurora'
import { GlassTheme } from './Glass'
import { MinimalTheme } from './Minimal'
import { NoirTheme } from './Noir'
import type { ThemeProps } from './shared/ThemeParts'

export const THEMES: Record<ThemeName, ComponentType<ThemeProps>> = {
  aurora: AuroraTheme,
  glass: GlassTheme,
  minimal: MinimalTheme,
  noir: NoirTheme,
}

export { AuroraTheme, GlassTheme, MinimalTheme, NoirTheme }
export type { ThemeProps }
