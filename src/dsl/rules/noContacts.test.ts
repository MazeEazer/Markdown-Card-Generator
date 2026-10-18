import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne } from './testHelpers.ts'

describe('no-contacts', () => {
  it('ни телефона, ни мессенджера', () => {
    const d = findOne(doc('city: Самара'), 'no-contacts')
    expect(d.severity).toBe('warning')
    expect(d.message).toMatch(/не смогут с вами связаться/)
  })

  it.each([
    ['телефон', 'phone: +7 999 123-45-67'],
    ['мессенджер', 'contacts:\n  telegram: barber_ivan'],
    ['почта', 'contacts:\n  email: hello@example.ru'],
    ['ссылка tel: в links', 'links:\n  - label: Позвонить\n    url: tel:+79991234567'],
    ['ссылка на Telegram в links', 'links:\n  - label: Telegram\n    url: https://t.me/barber_ivan'],
  ])('есть %s — без замечаний', (_, frontmatter) => {
    expect(findAll(doc(frontmatter), 'no-contacts')).toEqual([])
  })

  it('только сайт и primary не считаются способом связи', () => {
    expect(findAll(doc('contacts:\n  website: https://a.ru\n  primary: website'), 'no-contacts')).toHaveLength(1)
  })

  it('без шапки — только ошибка про шапку', () => {
    expect(findAll('## О себе', 'no-contacts')).toEqual([])
  })
})
