import { describe, expect, it } from 'vitest'
import { groundAmenities, UNGROUNDED_AMENITY, UNGROUNDED_AMENITY_TEXT } from './groundAmenities.ts'
import { AMENITY_KEYS, type AmenityKey } from './schema/amenities.ts'

const HEAD = '---\nname: Студия\nphone: +7 999 123-45-67\n---\n\n## Удобства\n'
const block = (...items: string[]) => `${HEAD}:::amenities\n${items.join('\n\n')}\n:::\n`

/** Подтверждает ли описание удобство: остаётся ли оно после проверки. */
const confirmed = (key: AmenityKey, description: string) => {
  const result = groundAmenities(block(`key: ${key}`), description)
  return result.removed.length === 0
}

describe('groundAmenities', () => {
  it('удобство из описания остаётся, остальные удаляются с кодом в журнале', () => {
    const text = block('key: parking\ntext: бесплатная', 'key: wifi', 'key: card')
    const result = groundAmenities(text, 'Студия. У нас бесплатная парковка и можно оплатить картой.')
    expect(result.removed).toEqual([UNGROUNDED_AMENITY])
    expect(result.text).toBe(block('key: parking\ntext: бесплатная', 'key: card'))
    expect(result.text).not.toContain('wifi')
    expect(result.text).toContain('key: card')
  })

  it('ничего не подтверждено — блок пуст (его затем убирает prune), не подтверждённое удалено', () => {
    const result = groundAmenities(block('key: parking', 'key: wifi'), 'Маникюр, Самара')
    expect(result.removed).toEqual([UNGROUNDED_AMENITY, UNGROUNDED_AMENITY])
    expect(result.text).not.toMatch(/key:/)
    // каркас блока цел — «:::» не съеден
    expect(result.text).toBe(`${HEAD}:::amenities\n:::\n`)
  })

  it('число в уточнении: нет в описании — убирается уточнение, удобство остаётся', () => {
    const text = block('key: parking\ntext: бесплатная, 10 мест')
    const dropped = groundAmenities(text, 'Есть парковка для клиентов')
    expect(dropped.removed).toEqual([UNGROUNDED_AMENITY_TEXT])
    expect(dropped.text).toContain('key: parking')
    expect(dropped.text).not.toContain('10 мест')

    const kept = groundAmenities(text, 'Есть бесплатная парковка на 10 мест')
    expect(kept).toEqual({ text, removed: [] })
  })

  it('неизвестный key не трогаем — это ошибка валидатора', () => {
    const text = block('key: sauna')
    expect(groundAmenities(text, 'сауна')).toEqual({ text, removed: [] })
  })

  it('без блока amenities документ не меняется', () => {
    const text = '---\nname: A\n---\n\n## О нас\nТекст\n'
    expect(groundAmenities(text, 'парковка')).toEqual({ text, removed: [] })
  })

  describe('подтверждения: названо в описании', () => {
    it.each<[AmenityKey, string]>([
      ['parking', 'Рядом бесплатная парковка'],
      ['parking', 'Есть стоянка для клиентов'],
      ['wifi', 'У нас Wi-Fi'],
      ['wifi', 'есть вайфай'],
      ['wifi', 'вай-фай бесплатно'],
      ['wifi', 'Бесплатный интернет для гостей'],
      ['card', 'Оплата картой или наличными'],
      ['card', 'Принимаем карты и СБП'],
      ['card', 'работаем по безналу'],
      ['accessible', 'Есть пандус для колясок'],
      ['kids', 'Работаю с детьми, есть детский уголок'],
      ['kids', 'можно с ребёнком'],
      ['pets', 'Можно с собаками'],
      ['pets', 'pet-friendly'],
      ['coffee', 'Кофе для гостей бесплатно'],
      ['coffee', 'Чай/кофе для клиентов'],
      ['coffee', 'Угощаем клиентов чаем'],
      ['waiting', 'Есть зона ожидания'],
      ['delivery', 'Доставка по городу'],
      ['ac', 'В студии кондиционер'],
      ['wardrobe', 'Есть гардероб'],
      ['online', 'Занятия онлайн'],
      ['online', 'Занимаемся по Zoom'],
      ['visit', 'Выезжаю на дом'],
      ['visit', 'выезд по городу'],
      ['visit', 'Приеду к вам домой'],
      ['certificate', 'Есть подарочные сертификаты'],
    ])('%s: «%s»', (key, description) => {
      expect(confirmed(key, description)).toBe(true)
    })
  })

  describe('ложные совпадения: удобства нет, хотя слово похоже', () => {
    it.each<[AmenityKey, string]>([
      ['card', 'Рисую картины и открытки на заказ'],
      ['card', 'Визитная карточка'],
      ['card', 'Карта Таро: расклады'],
      ['coffee', 'Кофейня «Зерно», кофе от 200 ₽'],
      ['coffee', 'Продаём чай и кофе на вынос'],
      ['kids', 'Детская стрижка 800 ₽'],
      ['kids', 'Детский массаж'],
      ['wifi', 'Работаю через интернет'],
      ['wifi', 'Продвижение в интернете'],
      ['visit', 'Принимаю дома'],
      ['visit', 'Стригу дома, Самара'],
      ['certificate', 'Есть сертификат мастера'],
      ['parking', 'Работаем ежедневно'],
      ['pets', 'Груминг, записывайтесь'],
      ['delivery', 'Торты на заказ'],
      ['waiting', 'Время ожидания 15 минут'],
    ])('%s не подтверждается: «%s»', (key, description) => {
      expect(confirmed(key, description)).toBe(false)
    })
  })

  it('каждое удобство подтверждается хотя бы одной своей фразой', () => {
    const samples: Record<AmenityKey, string> = {
      parking: 'парковка', wifi: 'wifi', card: 'оплата картой', accessible: 'пандус', kids: 'с детьми', pets: 'с собаками',
      coffee: 'угощаем', waiting: 'зона ожидания', delivery: 'доставка', ac: 'кондиционер', wardrobe: 'гардероб',
      online: 'онлайн', visit: 'выезд', certificate: 'подарочный сертификат',
    }
    for (const key of AMENITY_KEYS) expect(confirmed(key, samples[key]), key).toBe(true)
  })
})
