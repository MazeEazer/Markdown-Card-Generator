import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { serialize } from '../serialize.ts'
import { pruneEmptyBlocks } from '../prune.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

const amenities = (...items: string[]) => doc('phone: +7 999 123-45-67', `## Удобства\n:::amenities\n${items.join('\n\n')}\n:::`)

describe(':::amenities — валидация', () => {
  it('правильные key — без замечаний', () => {
    const text = amenities('key: parking\ntext: бесплатная', 'key: wifi')
    expect(findAll(text, 'amenity-unknown-key')).toEqual([])
    expect(findAll(text, 'invalid-value')).toEqual([])
  })

  it('неизвестный key — ошибка с подсказкой ближайшего и автоисправлением', () => {
    const text = amenities('key: parkng')
    const d = findOne(text, 'amenity-unknown-key')
    expect(d.severity).toBe('error')
    expect(d.message).toContain('Возможно, вы имели в виду «parking»')
    expect(underlined(text, d)).toBe('parkng')
    expect(fixAndRecheck(text, d)).toContain('key: parking')
  })

  it.each([
    ['парковка', 'parking'],
    ['вайфай', 'wifi'],
    ['Wi-Fi', 'wifi'],
    ['Parking', 'parking'],
    ['кондиционер', 'ac'],
  ])('«%s» → %s', (written, expected) => {
    const text = amenities(`key: ${written}`)
    expect(findOne(text, 'amenity-unknown-key').fix?.replace).toBe(expected)
  })

  it('совсем незнакомый key — список допустимых, без автоисправления', () => {
    const d = findOne(amenities('key: sauna'), 'amenity-unknown-key')
    expect(d.severity).toBe('error')
    expect(d.message).toMatch(/Можно: parking, wifi/)
    expect(d.fix).toBeUndefined()
  })

  it('invalid-value по key не дублирует ошибку', () => {
    expect(findAll(amenities('key: sauna'), 'invalid-value')).toEqual([])
  })

  it('повтор удобства — предупреждение', () => {
    const text = amenities('key: wifi', 'key: parking', 'key: wifi')
    const d = findOne(text, 'amenity-duplicate')
    expect(d.severity).toBe('warning')
    expect(underlined(text, d)).toBe('wifi')
  })

  it('элемент без key — как у остальных блоков: обязательное поле', () => {
    expect(findAll(amenities('text: бесплатная'), 'missing-item-field')).toHaveLength(1)
  })

  it('неизвестное поле — как у остальных блоков', () => {
    expect(findAll(amenities('key: wifi\nprice: 100'), 'unknown-field')).toHaveLength(1)
  })
})

describe(':::amenities — разбор, запись и очистка', () => {
  it('секция типа amenities с key и уточнением', () => {
    const data = parseCardMarkdown(amenities('key: parking\ntext: бесплатная, 10 мест', 'key: wifi')).data!
    expect(data.sections[0].type).toBe('amenities')
    expect(data.sections[0].amenities).toEqual([
      { key: 'parking', text: 'бесплатная, 10 мест' },
      { key: 'wifi', text: undefined },
    ])
  })

  it('serialize возвращает те же данные (туда и обратно)', () => {
    const data = parseCardMarkdown(amenities('key: parking\ntext: бесплатная, 10 мест', 'key: wifi')).data!
    const again = parseCardMarkdown(serialize(data)).data!
    expect(again.sections[0].amenities).toEqual(data.sections[0].amenities)
    expect(serialize(data)).toContain(':::amenities\nkey: parking\ntext: бесплатная, 10 мест\n\nkey: wifi\n:::')
  })

  it('пустой блок удаляется вместе с разделом (как у остальных блоков)', () => {
    const text = doc('phone: +7 999 123-45-67', '## Удобства\n:::amenities\n:::\n')
    expect(pruneEmptyBlocks(text)).toEqual({ text: doc('phone: +7 999 123-45-67', ''), removed: ['empty-block'] })
  })
})
