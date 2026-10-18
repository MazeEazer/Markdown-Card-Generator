import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe(':::contacts — разбор', () => {
  it('секция с блоком контактов', () => {
    const data = parseCardMarkdown(doc('phone: +7 999 123-45-67', '## Контакты\n:::contacts\n:::')).data!
    expect(data.sections).toEqual([{ title: 'Контакты', content: ':::contacts\n:::', type: 'contacts' }])
  })
})

describe('contacts-block-empty', () => {
  it('в шапке нет ни контактов, ни адреса', () => {
    const text = doc('city: Самара', '## Контакты\n:::contacts\n:::')
    const d = findOne(text, 'contacts-block-empty')
    expect(underlined(text, d)).toBe('contacts')
  })

  it.each([
    ['телефон', 'phone: +7 999 123-45-67'],
    ['мессенджер', 'contacts:\n  telegram: barber_ivan'],
    ['адрес', 'address: ул. Ленина, 10\ncity: Самара'],
  ])('есть %s — без замечаний', (_, frontmatter) => {
    expect(findAll(doc(frontmatter, ':::contacts\n:::'), 'contacts-block-empty')).toEqual([])
  })
})

describe('contacts-block-text', () => {
  it('текст внутри блока не показывается — исправление убирает его', () => {
    const text = doc('phone: +7 999 123-45-67', '## Контакты\n:::contacts\nЗвоните с 10 до 20\n:::')
    const d = findOne(text, 'contacts-block-text')
    expect(d.severity).toBe('info')
    expect(underlined(text, d)).toBe('Звоните с 10 до 20')
    expect(fixAndRecheck(text, d)).toContain(':::contacts\n\n:::')
  })
})

describe('max-not-link', () => {
  it('имя пользователя вместо ссылки', () => {
    const text = doc('contacts:\n  max: barber_ivan')
    const d = findOne(text, 'max-not-link')
    expect(underlined(text, d)).toBe('barber_ivan')
    expect(d.message).toMatch(/QR-кода/)
  })

  it('ссылка на профиль — без замечаний', () => {
    expect(findAll(doc('contacts:\n  max: https://max.ru/u/f9LHodD0cOKGmHmt'), 'max-not-link')).toEqual([])
  })
})
