import { describe, expect, it } from 'vitest'
import { contactLinks, primaryLink } from './contactLinks.ts'

describe('contactLinks', () => {
  it('строит ссылки для всех способов связи в порядке показа', () => {
    const links = contactLinks({
      phone: '+7 999 123-45-67',
      contacts: {
        website: 'barber-samara.ru',
        email: 'hello@barber.ru',
        instagram: 'barber.ivan',
        vk: 'barber_samara',
        max: 'https://max.ru/u/f9LHodD0cOKGmHmt',
        whatsapp: '+7 999 123-45-67',
        telegram: 'barber_ivan',
        primary: 'telegram',
      },
    })
    expect(links.map((link) => [link.kind, link.href, link.display])).toEqual([
      ['phone', 'tel:+79991234567', '+7 999 123-45-67'],
      ['telegram', 'https://t.me/barber_ivan', '@barber_ivan'],
      ['whatsapp', 'https://wa.me/79991234567', '+7 999 123-45-67'],
      ['max', 'https://max.ru/u/f9LHodD0cOKGmHmt', 'Профиль в MAX'],
      ['vk', 'https://vk.com/barber_samara', 'vk.com/barber_samara'],
      ['instagram', 'https://instagram.com/barber.ivan', '@barber.ivan'],
      ['email', 'mailto:hello@barber.ru', 'hello@barber.ru'],
      ['website', 'https://barber-samara.ru', 'barber-samara.ru'],
    ])
  })

  it('понимает записи «как придётся»: 8-…, ссылки, @имя', () => {
    const links = contactLinks({
      phone: '8 (999) 123-45-67',
      contacts: { telegram: 'https://t.me/barber_ivan', whatsapp: 'wa.me/79991234567', instagram: '@barber.ivan' },
    })
    expect(links.map((link) => link.href)).toEqual([
      'tel:+79991234567',
      'https://t.me/barber_ivan',
      'https://wa.me/79991234567',
      'https://instagram.com/barber.ivan',
    ])
  })

  it('иностранный номер — ссылка по цифрам', () => {
    expect(contactLinks({ phone: '+375 29 123-45-67' })[0].href).toBe('tel:+375291234567')
  })

  it('из непонятного значения ссылку не строим', () => {
    const links = contactLinks({ phone: 'звоните', contacts: { whatsapp: 'ivan', max: 'barber_ivan', telegram: 'барбер' } })
    expect(links.map((link) => link.href)).toEqual([null, null, null, null])
    expect(links[0].display).toBe('звоните')
  })

  it('без контактов — пусто', () => {
    expect(contactLinks({})).toEqual([])
  })
})

describe('primaryLink', () => {
  it('contacts.primary', () => {
    expect(primaryLink({ phone: '+7 999 123-45-67', contacts: { telegram: 'barber_ivan', primary: 'telegram' } })?.action).toBe(
      'Написать в Telegram',
    )
  })

  it('без primary — телефон', () => {
    expect(primaryLink({ phone: '+7 999 123-45-67', contacts: { telegram: 'barber_ivan' } })?.action).toBe('Позвонить')
  })

  it('без телефона — первый контакт со ссылкой', () => {
    expect(primaryLink({ contacts: { whatsapp: 'ivan', vk: 'barber_samara' } })?.kind).toBe('vk')
  })

  it('primary на контакт без ссылки — запасной вариант', () => {
    expect(primaryLink({ phone: '+7 999 123-45-67', contacts: { max: 'barber_ivan', primary: 'max' } })?.kind).toBe('phone')
  })

  it('связаться не по чему — null', () => {
    expect(primaryLink({ contacts: { telegram: 'барбер' } })).toBeNull()
  })
})
