import { renderToStaticMarkup } from 'react-dom/server'
import type { CardData, ResolvedTheme } from '../types/card'
import { getCardExportCss } from './cardStyles'
import { THEMES } from '../themes'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'card'
}

export function exportHtml(data: CardData, resolved: ResolvedTheme): { html: string; filename: string } {
  const ThemeComponent = THEMES[resolved.theme]
  const body = renderToStaticMarkup(<ThemeComponent data={data} colors={resolved.colors} />)

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.name)}${data.title ? ` — ${escapeHtml(data.title)}` : ''}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --accent: ${resolved.colors.accent};
      --accent-light: ${resolved.colors.accentLight};
      --accent-dark: ${resolved.colors.accentDark};
    }
    ${getCardExportCss()}
  </style>
</head>
<body>
  ${body}
</body>
</html>`

  return { html, filename: `card-${slugify(data.name)}.html` }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
