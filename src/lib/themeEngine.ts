import type { CardData, ResolvedTheme, ThemeColors, ThemeName } from '../types/card'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generatePalette(seed: string): ThemeColors {
  const hash = hashString(seed)
  const hue = hash % 360
  const accent = hslToHex(hue, 72, 55)
  const accentLight = hslToHex(hue, 65, 70)
  const accentDark = hslToHex(hue, 75, 38)

  return {
    accent,
    accentLight,
    accentDark,
    background: hslToHex(hue, 25, 97),
    surface: '#ffffff',
    text: hslToHex(hue, 15, 15),
    textMuted: hslToHex(hue, 10, 45),
  }
}

const THEME_KEYWORDS: Record<ThemeName, string[]> = {
  aurora: ['design', 'designer', 'creative', 'art', 'ui', 'ux', 'illustrat', 'brand', 'дизайн', 'креатив'],
  noir: ['developer', 'engineer', 'program', 'code', 'dev', 'backend', 'frontend', 'fullstack', 'разработ', 'инженер'],
  minimal: ['manager', 'director', 'lead', 'consult', 'analyst', 'product', 'менедж', 'директор', 'консульт'],
  glass: ['architect', 'data', 'scientist', 'research', 'architect', 'аналит', 'архитект'],
}

function detectTheme(data: CardData): ThemeName {
  const corpus = [
    data.title,
    ...data.sections.map((s) => `${s.title} ${s.content}`),
  ]
    .join(' ')
    .toLowerCase()

  let best: ThemeName = 'aurora'
  let bestScore = 0

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [ThemeName, string[]][]) {
    const score = keywords.reduce((acc, kw) => acc + (corpus.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = theme
    }
  }

  return bestScore > 0 ? best : 'aurora'
}

function paletteForTheme(theme: ThemeName, seed: string): ThemeColors {
  const base = generatePalette(seed)

  switch (theme) {
    case 'noir':
      return {
        ...base,
        background: '#0a0a0f',
        surface: '#14141f',
        text: '#f0f0f5',
        textMuted: '#8888a0',
      }
    case 'minimal':
      return {
        ...base,
        background: '#fafafa',
        surface: '#ffffff',
        text: '#1a1a1a',
        textMuted: '#666666',
      }
    case 'glass':
      return {
        ...base,
        background: `linear-gradient(135deg, ${base.accentLight}22, ${base.accent}11)`,
        surface: 'rgba(255,255,255,0.15)',
        text: '#1a1a2e',
        textMuted: '#555570',
      }
    default:
      return base
  }
}

export function resolveTheme(data: CardData | null | undefined, overrideTheme?: ThemeName): ResolvedTheme {
  const safe = data ?? { name: 'Guest', title: '', theme: 'auto' as const, accent: 'auto' as const, links: [], sections: [] }

  const theme =
    overrideTheme ??
    (safe.theme === 'auto' ? detectTheme(safe) : safe.theme)

  const seed = safe.name
  const colors =
    safe.accent !== 'auto'
      ? { ...paletteForTheme(theme, seed), accent: safe.accent, accentLight: safe.accent, accentDark: safe.accent }
      : paletteForTheme(theme, seed)

  return { theme, colors }
}

export const THEME_LABELS: Record<ThemeName, string> = {
  aurora: 'Aurora',
  glass: 'Glass',
  minimal: 'Minimal',
  noir: 'Noir',
}
