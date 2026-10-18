import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('invalid-value: шапка', () => {
  it('неизвестная тема — список допустимых', () => {
    const text = doc('theme: neon')
    const d = findOne(text, 'invalid-value')
    expect(underlined(text, d)).toBe('neon')
    expect(d.message).toMatch(/glass, minimal, noir, vercel, auto/)
    expect(d.fix).toBeUndefined()
  })

  it('тема с заглавной буквы — исправление', () => {
    const text = doc('theme: Noir')
    expect(fixAndRecheck(text, findOne(text, 'invalid-value'))).toContain('theme: noir')
  })

  it('неизвестный вид бизнеса', () => {
    expect(findOne(doc('business: cafe'), 'invalid-value').message).toMatch(/barbershop/)
  })

  it('ссылка без https:// — исправление', () => {
    const text = doc('avatar: example.ru/logo.png')
    expect(fixAndRecheck(text, findOne(text, 'invalid-value'))).toContain('avatar: https://example.ru/logo.png')
  })

  it('почта с ошибкой', () => {
    expect(findOne(doc('contacts:\n  email: hello.example.ru'), 'invalid-value').message).toMatch(/почты/)
  })

  it('primary на неизвестный способ связи', () => {
    expect(findOne(doc('contacts:\n  primary: tg'), 'invalid-value').message).toMatch(/telegram/)
  })

  it('contacts не списком', () => {
    expect(findOne(doc('contacts: нет'), 'invalid-value').message).toMatch(/contacts:\n {2}telegram/)
  })

  it('name списком вместо строки', () => {
    expect(findOne('---\nname: [А, Б]\n---\n', 'invalid-value').message).toMatch(/одной строкой/)
  })

  it('телефон-число и правильные значения — без замечаний', () => {
    expect(
      findAll(doc('phone: 89991234567\ntheme: noir\nbusiness: nails\navatar: https://a.ru/a.png\ncontacts:\n  primary: phone'), 'invalid-value'),
    ).toEqual([])
  })
})

describe('invalid-value: блоки', () => {
  it('неизвестная иконка карточки', () => {
    const text = doc('', ':::cards\ntitle: A\nicon: scissors\n:::')
    expect(underlined(text, findOne(text, 'invalid-value'))).toBe('scissors')
  })

  it('ссылка карточки без https://', () => {
    const text = doc('', ':::cards\ntitle: A\nurl: t.me/ivan\n:::')
    expect(fixAndRecheck(text, findOne(text, 'invalid-value'))).toContain('url: https://t.me/ivan')
  })

  it('пустое значение не проверяется', () => {
    expect(findAll(doc('', ':::cards\ntitle: A\nicon:\n:::'), 'invalid-value')).toEqual([])
  })
})
