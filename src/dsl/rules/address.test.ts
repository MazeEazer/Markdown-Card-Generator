import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, underlined } from './testHelpers.ts'

describe('address-without-city', () => {
  it('адрес без города', () => {
    const text = doc('address: ул. Ленина, 10')
    const d = findOne(text, 'address-without-city')
    expect(underlined(text, d)).toBe('ул. Ленина, 10')
    expect(d.message).toMatch(/city/)
  })

  it('город внутри адреса — подсказка перенести', () => {
    expect(findOne(doc('address: г. Самара, ул. Ленина, 10'), 'address-without-city').message).toMatch(/перенесите/)
  })

  it.each([
    ['есть city', 'address: ул. Ленина, 10\ncity: Самара'],
    ['есть location', 'address: ул. Ленина, 10\nlocation: Самара'],
    ['нет адреса', 'city: Самара'],
  ])('%s — без замечаний', (_, frontmatter) => {
    expect(findAll(doc(frontmatter), 'address-without-city')).toEqual([])
  })
})
