import { describe, expect, it } from 'vitest'
import { toCardData } from './cardData.ts'
import { parseDocument } from './parser.ts'

function cardData(text: string) {
  const result = toCardData(parseDocument(text))
  expect(result.error).toBeNull()
  return result.data!
}

describe('toCardData: поля бизнеса', () => {
  it('читает business, phone, address, city, currency', () => {
    const data = cardData(
      '---\nname: Борода\nbusiness: barbershop\nphone: +7 999 123-45-67\naddress: ул. Ленина, 10\ncity: Самара\ncurrency: RUB\n---\n',
    )
    expect(data).toMatchObject({
      business: 'barbershop',
      phone: '+7 999 123-45-67',
      address: 'ул. Ленина, 10',
      city: 'Самара',
      currency: 'RUB',
    })
  })

  it('телефон без пробелов не теряет «+» (YAML прочитал бы его как число)', () => {
    expect(cardData('---\nname: A\nphone: +79991234567\n---\n').phone).toBe('+79991234567')
  })

  it('contacts: только известные ключи, пустые отбрасываются', () => {
    const data = cardData(
      '---\nname: A\ncontacts:\n  telegram: barber_ivan\n  whatsapp: +79991234567\n  vk:\n  telegramm: опечатка\n  primary: telegram\n---\n',
    )
    expect(data.contacts).toEqual({ telegram: 'barber_ivan', whatsapp: '+79991234567', primary: 'telegram' })
  })

  it('без полей бизнеса — undefined', () => {
    const data = cardData('---\nname: A\ncontacts: нет\n---\n')
    expect(data.phone).toBeUndefined()
    expect(data.contacts).toBeUndefined()
  })
})
