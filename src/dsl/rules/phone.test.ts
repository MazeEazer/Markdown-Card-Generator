import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('phone-format', () => {
  it.each(['8-999-123-45-67', '89991234567', '+7 (999) 123 45 67', '9991234567'])('phone: %s → +7 999 123-45-67', (raw) => {
    const text = doc(`phone: ${raw}`)
    const d = findOne(text, 'phone-format')
    expect(underlined(text, d)).toBe(raw)
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.phone).toBe('+7 999 123-45-67')
  })

  it('номер в кавычках тоже исправляется', () => {
    const text = doc('phone: "8 999 123 45 67"')
    expect(fixAndRecheck(text, findOne(text, 'phone-format'))).toContain('phone: +7 999 123-45-67')
  })

  it('не номер — без исправления', () => {
    const d = findOne(doc('phone: 8-999-123'), 'phone-format')
    expect(d.message).toMatch(/10 цифр/)
    expect(d.fix).toBeUndefined()
  })

  it('правильный и иностранный номер — без замечаний', () => {
    expect(findAll(doc('phone: +7 999 123-45-67'), 'phone-format')).toEqual([])
    expect(findAll(doc('phone: +375 29 123-45-67'), 'phone-format')).toEqual([])
  })

  it('номер WhatsApp тоже приводится к единому виду', () => {
    const text = doc('contacts:\n  whatsapp: 8-999-123-45-67')
    expect(fixAndRecheck(text, findOne(text, 'phone-format'))).toContain('whatsapp: +7 999 123-45-67')
  })

  it('ссылка wa.me вместо номера', () => {
    const text = doc('contacts:\n  whatsapp: https://wa.me/79991234567')
    expect(fixAndRecheck(text, findOne(text, 'phone-format'))).toContain('whatsapp: +7 999 123-45-67')
  })
})

describe('whatsapp-not-phone', () => {
  it('имя пользователя вместо номера', () => {
    const text = doc('contacts:\n  whatsapp: barber_ivan')
    const d = findOne(text, 'whatsapp-not-phone')
    expect(underlined(text, d)).toBe('barber_ivan')
    expect(d.message).toMatch(/номер телефона/)
  })
})
