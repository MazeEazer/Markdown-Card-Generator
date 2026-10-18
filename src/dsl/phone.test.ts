import { describe, expect, it } from 'vitest'
import { parseRussianPhone } from './phone.ts'

describe('parseRussianPhone', () => {
  it.each([
    '+7 999 123-45-67',
    '+79991234567',
    '79991234567',
    '89991234567',
    '8-999-123-45-67',
    '8 (999) 123-45-67',
    '+7 (999) 1234567',
    '999 123 45 67',
    '9991234567',
    '  +7.999.123.45.67  ',
    'https://wa.me/79991234567',
    'wa.me/79991234567',
  ])('%s → +7 999 123-45-67', (value) => {
    expect(parseRussianPhone(value)).toEqual({ e164: '+79991234567', display: '+7 999 123-45-67' })
  })

  it.each([
    ['мало цифр', '8-999-123-45'],
    ['много цифр', '+7 999 123-45-678'],
    ['не российский', '+375 29 123-45-67'],
    ['имя пользователя', 'barber_ivan'],
    ['текст', 'звоните после 10'],
    ['пусто', ''],
  ])('%s: %j → null', (_, value) => {
    expect(parseRussianPhone(value)).toBeNull()
  })
})
