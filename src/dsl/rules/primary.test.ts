import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('primary-unknown', () => {
  it('ведёт в WhatsApp, а указан только Telegram — исправление на него', () => {
    const text = doc('contacts:\n  telegram: barber_ivan\n  primary: whatsapp')
    const d = findOne(text, 'primary-unknown')
    expect(underlined(text, d)).toBe('whatsapp')
    expect(d.message).toMatch(/WhatsApp/)
    expect(fixAndRecheck(text, d)).toContain('primary: telegram')
  })

  it('ведёт на звонок без телефона', () => {
    expect(findOne(doc('contacts:\n  telegram: barber_ivan\n  primary: phone'), 'primary-unknown').message).toMatch(/телефон/)
  })

  it('несколько вариантов — без автоисправления', () => {
    const d = findOne(doc('phone: +7 999 123-45-67\ncontacts:\n  telegram: barber_ivan\n  primary: vk'), 'primary-unknown')
    expect(d.fix).toBeUndefined()
  })

  it('указанный контакт или телефон — без замечаний', () => {
    expect(findAll(doc('contacts:\n  telegram: barber_ivan\n  primary: telegram'), 'primary-unknown')).toEqual([])
    expect(findAll(doc('phone: +7 999 123-45-67\ncontacts:\n  primary: phone'), 'primary-unknown')).toEqual([])
  })

  it('недопустимое значение — только invalid-value', () => {
    const text = doc('contacts:\n  primary: pigeon')
    expect(findAll(text, 'primary-unknown')).toEqual([])
    expect(findAll(text, 'invalid-value')).toHaveLength(1)
  })
})
