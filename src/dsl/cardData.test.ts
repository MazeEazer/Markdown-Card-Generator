import { describe, expect, it } from 'vitest'
import { previewTargets, toCardData } from './cardData.ts'
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

describe('previewTargets: куда переводить курсор по клику в превью', () => {
  const text = '---\ntitle: Стрижки\nname: Борода\n---\n\n## Пустая\n\n## О нас\nТекст\n\n## Цены\n:::services\ntitle: А\n:::\n'
  const ast = parseDocument(text)

  it('шапка → начало поля name', () => {
    const { header } = previewTargets(ast)
    expect(text.slice(header, header + 5)).toBe('name:')
  })

  it('секции — по порядку на сайте, пустые пропущены, как в CardData', () => {
    const { sections } = previewTargets(ast)
    expect(sections).toHaveLength(toCardData(ast).data!.sections.length)
    expect(sections.map((from) => text.slice(from, text.indexOf('\n', from)))).toEqual(['## О нас', '## Цены'])
  })

  it('безымянная секция в начале — с первой строки текста', () => {
    const plain = '---\nname: Борода\n---\nПросто текст\n'
    const { sections } = previewTargets(parseDocument(plain))
    expect(plain.slice(sections[0], sections[0] + 6)).toBe('Просто')
  })
})
