import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('contact-link', () => {
  it.each([
    ['telegram', 'https://t.me/barber_ivan', 'barber_ivan'],
    ['telegram', 't.me/barber_ivan', 'barber_ivan'],
    ['telegram', 'https://telegram.me/barber_ivan/', 'barber_ivan'],
    ['vk', 'https://vk.com/barber_samara', 'barber_samara'],
    ['vk', 'm.vk.com/barber.samara', 'barber.samara'],
    ['instagram', 'https://www.instagram.com/barber.ivan/', 'barber.ivan'],
    ['instagram', '"@barber.ivan"', 'barber.ivan'],
  ])('%s: %s → %s', (contact, raw, username) => {
    const text = doc(`contacts:\n  ${contact}: ${raw}`)
    const d = findOne(text, 'contact-link')
    expect(underlined(text, d)).toBe(raw)
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.contacts).toEqual({ [contact]: username })
  })

  it('имя пользователя — без замечаний', () => {
    expect(findAll(doc('contacts:\n  telegram: barber_ivan\n  vk: barber_samara'), 'contact-link')).toEqual([])
  })
})

describe('@ в начале значения', () => {
  it('telegram: @ivan — ошибка YAML с понятным исправлением', () => {
    const text = doc('contacts:\n  telegram: @barber_ivan')
    const d = findOne(text, 'invalid-yaml')
    expect(d.message).toMatch(/без @/)
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.contacts).toEqual({ telegram: 'barber_ivan' })
  })
})

describe('telegram-username', () => {
  it.each([
    ['короткое', 'ivan', /от 5 до 32/],
    ['кириллица', 'барбер_иван', /латинские/],
    ['номер телефона', '+79991234567', /не номер телефона/],
    ['начинается с цифры', '1barber', /с буквы/],
    ['заканчивается на _', 'barber_', /«_»/],
    ['пробел', '"barber ivan"', /латинские/],
    ['ссылка-приглашение', 'https://t.me/+AbCdEf', /не ссылка/],
  ])('%s: %s', (_, raw, message) => {
    expect(findOne(doc(`contacts:\n  telegram: ${raw}`), 'telegram-username').message).toMatch(message)
  })

  it('имя из ссылки проверяется тоже', () => {
    expect(findAll(doc('contacts:\n  telegram: https://t.me/ivan'), 'telegram-username')).toHaveLength(1)
  })

  it('правильное имя — без замечаний', () => {
    expect(findAll(doc('contacts:\n  telegram: Barber_Ivan_63'), 'telegram-username')).toEqual([])
  })
})
