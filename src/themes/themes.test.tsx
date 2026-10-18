// Рендер блоков во всех 4 темах — так же, как при экспорте HTML (renderToStaticMarkup).
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { THEME_NAMES } from '../dsl/schema/frontmatter'
import { parseCardMarkdown } from '../lib/parser'
import { resolveTheme } from '../lib/themeEngine'
import { THEMES } from './index'

function render(markdown: string, theme: (typeof THEME_NAMES)[number]): string {
  const data = parseCardMarkdown(markdown).data!
  const Theme = THEMES[theme]
  return renderToStaticMarkup(<Theme data={data} colors={resolveTheme(data, theme).colors} />)
}

const business = `---
name: Барбершоп «Борода»
phone: 8-999-123-45-67
address: ул. Ленина, 10
city: Самара
contacts:
  telegram: barber_ivan
  whatsapp: +7 999 123-45-67
  max: https://max.ru/u/f9LHodD0cOKGmHmt
  email: hello@barber.ru
---
## Контакты
:::contacts
:::
`

describe.each(THEME_NAMES)('тема %s', (theme) => {
  it(':::contacts — телефон, адрес и ссылки на мессенджеры', () => {
    const html = render(business, theme)
    expect(html).toContain('href="tel:+79991234567"')
    expect(html).toContain('+7 999 123-45-67')
    expect(html).toContain('Самара, ул. Ленина, 10')
    expect(html).toContain('href="https://t.me/barber_ivan"')
    expect(html).toContain('href="https://wa.me/79991234567"')
    expect(html).toContain('href="https://max.ru/u/f9LHodD0cOKGmHmt"')
    expect(html).toContain('href="mailto:hello@barber.ru"')
  })
})
