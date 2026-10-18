import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { THEME_NAMES } from '../dsl/schema/frontmatter'
import { getCardExportCss } from '../lib/cardStyles'
import { parseCardMarkdown } from '../lib/parser'
import { resolveTheme } from '../lib/themeEngine'
import { readableOn } from './shared/colors'
import { Site } from './Site'

function render(frontmatter: string, theme: (typeof THEME_NAMES)[number] = 'minimal'): string {
  const data = parseCardMarkdown(`---\nname: Борода\n${frontmatter}\n---\n## О нас\nТекст\n`).data!
  return renderToStaticMarkup(<Site data={data} resolved={resolveTheme(data, theme)} />)
}

/** Кнопки панели связи по порядку: [href, подпись]. */
function barButtons(html: string): [string, string][] {
  const bar = html.match(/<nav class="md-contact-bar"[\s\S]*?<\/nav>/)?.[0] ?? ''
  return [...bar.matchAll(/<a href="([^"]+)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/a>/g)].map((m) => [m[1], m[2]])
}

const contacts = 'phone: +7 999 123-45-67\ncontacts:\n  telegram: barber_ivan\n  whatsapp: +7 999 123-45-67\n  vk: barber_samara\n  email: a@b.ru'

describe.each(THEME_NAMES)('панель связи, тема %s', (theme) => {
  it('до трёх кнопок: звонок и мессенджеры', () => {
    expect(barButtons(render(contacts, theme))).toEqual([
      ['tel:+79991234567', 'Позвонить'],
      ['https://t.me/barber_ivan', 'Telegram'],
      ['https://wa.me/79991234567', 'WhatsApp'],
    ])
  })
})

describe('панель связи', () => {
  it('главный контакт — первым', () => {
    expect(barButtons(render(`${contacts}\n  primary: whatsapp`))[0]).toEqual(['https://wa.me/79991234567', 'WhatsApp'])
  })

  it('почта и сайт в панель не попадают; без звонка и мессенджеров панели нет', () => {
    expect(render('contacts:\n  email: a@b.ru\n  website: https://a.ru')).not.toContain('md-contact-bar')
  })

  it('сайт обёрнут в контейнер, а CSS показывает панель только на узком экране', () => {
    expect(render(contacts)).toMatch(/^<div class="md-site">/)
    const css = getCardExportCss()
    expect(css).toContain('.md-site { container: md-site / inline-size; }')
    expect(css).toContain('.md-contact-bar { display: none; }')
    expect(css).toContain('@container md-site (max-width: 640px) { .md-contact-bar { display: flex; } }')
  })
})

describe('readableOn', () => {
  it.each([
    ['#ffffff', '#111111'],
    ['#e6e63a', '#111111'],
    ['#2563eb', '#ffffff'],
    ['#c0392b', '#ffffff'],
    ['linear-gradient(…)', '#ffffff'],
  ])('%s → %s', (color, text) => {
    expect(readableOn(color)).toBe(text)
  })
})
