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

const services = `---
name: Барбершоп «Борода»
contacts:
  telegram: barber_ivan
  primary: telegram
---
## Услуги
:::services
title: Мужская стрижка
price: 1500
duration: 60 мин
description: С мытьём головы

title: Борода
price: от 800
:::
`

describe.each(THEME_NAMES)('тема %s', (theme) => {
  it(':::services — цены с ₽ и кнопка «Записаться» на главный контакт', () => {
    const html = render(services, theme)
    expect(html).toContain('Мужская стрижка')
    expect(html).toContain('1\u00a0500\u00a0₽')
    expect(html).toContain('от\u00a0800\u00a0₽')
    expect(html.match(/href="https:\/\/t\.me\/barber_ivan"[^>]*>Записаться/g)).toHaveLength(2)
  })

  it(':::services без контактов — без кнопки', () => {
    expect(render(services.replace(/contacts:\n {2}telegram: barber_ivan\n {2}primary: telegram\n/, ''), theme)).not.toContain('Записаться')
  })

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
