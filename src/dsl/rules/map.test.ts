import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, underlined } from './testHelpers.ts'

describe(':::map — разбор', () => {
  it('без своего адреса и со своим', () => {
    const plain = parseCardMarkdown(doc('phone: +7 999 123-45-67', '## Как добраться\n:::map\n:::')).data!
    expect(plain.sections[0]).toMatchObject({ type: 'map', map: {} })
    const own = parseCardMarkdown(doc('phone: +7 999 123-45-67', ':::map\naddress: Московское ш., 1\n:::')).data!
    expect(own.sections[0].map).toEqual({ address: 'Московское ш., 1' })
  })
})

describe('map-no-address', () => {
  it('нет ни адреса, ни города', () => {
    const text = doc('phone: +7 999 123-45-67', ':::map\n:::')
    const d = findOne(text, 'map-no-address')
    expect(underlined(text, d)).toBe('map')
    expect(d.message).toMatch(/city: город и address/)
  })

  it('только город', () => {
    expect(findOne(doc('phone: +7 999 123-45-67\ncity: Самара', ':::map\n:::'), 'map-no-address').message).toMatch(
      /покажет весь Самара|весь Самара/,
    )
  })

  it.each([
    ['адрес в шапке', 'address: ул. Ленина, 10\ncity: Самара', ':::map\n:::'],
    ['свой адрес в блоке', 'city: Самара', ':::map\naddress: ул. Ленина, 10\n:::'],
  ])('%s — без замечаний', (_, frontmatter, body) => {
    expect(findAll(doc(`phone: +7 999 123-45-67\n${frontmatter}`, body), 'map-no-address')).toEqual([])
  })

  it('неизвестное поле в блоке — подсказка', () => {
    expect(findOne(doc('city: Самара', ':::map\nadress: ул. Ленина, 10\n:::'), 'unknown-field').message).toMatch(/«address»/)
  })
})
