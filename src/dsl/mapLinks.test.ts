import { describe, expect, it } from 'vitest'
import { mapLinks, mapQuery } from './mapLinks.ts'

describe('mapQuery', () => {
  it.each([
    [{ city: 'Самара', address: 'ул. Ленина, 10' }, undefined, 'Самара, ул. Ленина, 10'],
    [{ address: 'ул. Ленина, 10' }, undefined, 'ул. Ленина, 10'],
    [{ city: 'Самара', address: 'г. Самара, ул. Ленина, 10' }, undefined, 'г. Самара, ул. Ленина, 10'],
    [{ city: 'Самара', address: 'ул. Ленина, 10' }, 'Московское ш., 1', 'Самара, Московское ш., 1'],
    [{ city: 'Самара' }, undefined, null],
    [{}, undefined, null],
  ])('%j + %j → %j', (card, blockAddress, query) => {
    expect(mapQuery(card, blockAddress)).toBe(query)
  })
})

describe('mapLinks', () => {
  it('адрес кодируется для ссылок', () => {
    expect(mapLinks('Самара, ул. Ленина, 10')).toEqual({
      widget: 'https://yandex.ru/map-widget/v1/?text=%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D0%B0%2C%20%D1%83%D0%BB.%20%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%2C%2010&z=16',
      yandex: 'https://yandex.ru/maps/?text=%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D0%B0%2C%20%D1%83%D0%BB.%20%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%2C%2010',
      twoGis: 'https://2gis.ru/search/%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D0%B0%2C%20%D1%83%D0%BB.%20%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%2C%2010',
    })
  })
})
