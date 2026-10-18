import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

/** Блок услуг; описание добавляется, чтобы не мешало правило service-no-description. */
function services(...items: string[]): string {
  return doc('phone: +7 999 123-45-67', `## Услуги\n:::services\n${items.join('\n\n')}\n:::`)
}

describe(':::services — разбор', () => {
  it('услуги с ценой, длительностью и описанием', () => {
    const data = parseCardMarkdown(
      services('title: Стрижка\nprice: 1500\nduration: 60 мин\ndescription: С мытьём', 'title: Борода\nprice: от 800'),
    ).data!
    expect(data.sections[0].type).toBe('services')
    expect(data.sections[0].services).toEqual([
      { title: 'Стрижка', price: '1500', duration: '60 мин', description: 'С мытьём' },
      { title: 'Борода', price: 'от 800', duration: undefined, description: undefined },
    ])
  })
})

describe('price-not-number', () => {
  it.each([
    ['1500р', '1500'],
    ['1 500 ₽', '1500'],
    ['от 800 руб.', 'от 800'],
    ['1500 рублей', '1500'],
  ])('price: %s → %s', (raw, fixed) => {
    const text = services(`title: Стрижка\nprice: ${raw}\ndescription: С мытьём`)
    const d = findOne(text, 'price-not-number')
    expect(underlined(text, d)).toBe(raw)
    expect(d.message).toMatch(/₽ сайт добавит сам/)
    expect(fixAndRecheck(text, d)).toContain(`price: ${fixed}\n`)
  })

  it('непонятная цена — без исправления', () => {
    const d = findOne(services('title: Стрижка\nprice: дорого\ndescription: С мытьём'), 'price-not-number')
    expect(d.fix).toBeUndefined()
  })

  it.each(['1500', 'от 1500', '1500–2000', 'бесплатно', 'по договорённости'])('price: %s — без замечаний', (price) => {
    expect(findAll(services(`title: Стрижка\nprice: ${price}\ndescription: С мытьём`), 'price-not-number')).toEqual([])
  })
})

describe('duplicate-service', () => {
  it('одинаковые названия — второе подчёркнуто', () => {
    const text = services('title: Стрижка\nprice: 1500\ndescription: А', 'title: стрижка \nprice: 1700\ndescription: Б')
    const d = findOne(text, 'duplicate-service')
    expect(underlined(text, d)).toBe('стрижка')
    expect(d.from).toBeGreaterThan(text.indexOf('price: 1500'))
  })

  it('повтор в двух разных блоках услуг', () => {
    const text = `${services('title: Стрижка\ndescription: А')}\n## Ещё\n:::services\ntitle: Стрижка\ndescription: Б\n:::`
    expect(findAll(text, 'duplicate-service')).toHaveLength(1)
  })
})

describe('service-no-description', () => {
  it('услуга без описания — совет', () => {
    const d = findOne(services('title: Стрижка\nprice: 1500'), 'service-no-description')
    expect(d.severity).toBe('info')
  })
})
