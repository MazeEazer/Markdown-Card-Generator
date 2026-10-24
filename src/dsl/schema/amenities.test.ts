import { describe, expect, it } from 'vitest'
import { AMENITIES, AMENITY_ALIASES, AMENITY_KEYS, AMENITY_LIST } from './amenities.ts'

describe('удобства: справочник', () => {
  it('список key', () => {
    expect(AMENITY_KEYS).toEqual([
      'parking', 'wifi', 'card', 'accessible', 'kids', 'pets', 'coffee', 'waiting', 'delivery', 'ac', 'wardrobe', 'online', 'visit', 'certificate',
    ])
  })

  it.each(AMENITY_KEYS)('%s: русское название, фразы и написания', (key) => {
    expect(AMENITIES[key].label).toMatch(/[а-яё]|Wi-Fi/i)
    expect(AMENITIES[key].phrases.length).toBeGreaterThan(0)
    expect(AMENITIES[key].aliases.length).toBeGreaterThan(0)
  })

  it('написания не указывают на чужой key дважды', () => {
    const seen = new Map<string, string>()
    for (const key of AMENITY_KEYS) {
      for (const alias of AMENITIES[key].aliases) {
        expect(seen.get(alias) ?? key, alias).toBe(key)
        seen.set(alias, key)
      }
    }
    expect(AMENITY_ALIASES['вайфай']).toBe('wifi')
  })

  it('справка перечисляет все key с названиями', () => {
    for (const key of AMENITY_KEYS) expect(AMENITY_LIST).toContain(`${key} — ${AMENITIES[key].label}`)
  })

  it('нет open24 и restroom — круглосуточно есть в блоке часов', () => {
    expect(AMENITY_KEYS).not.toContain('open24')
    expect(AMENITY_KEYS).not.toContain('restroom')
  })
})
