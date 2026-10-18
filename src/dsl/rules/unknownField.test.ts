import { describe, expect, it } from 'vitest'
import { parseAccordion } from '../sections.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('unknown-field: шапка', () => {
  it.each([
    ['в шапке', doc('phon: +7 999'), 'phon'],
    ['в contacts', doc('contacts:\n  telegramm: ivan'), 'telegramm'],
    ['в ссылке', doc('links:\n  - label: A\n    urll: https://a.ru'), 'urll'],
  ])('%s', (_, text, key) => {
    const d = findOne(text, 'unknown-field')
    expect(underlined(text, d)).toBe(key)
    expect(d.severity).toBe('warning')
  })

  it('известные поля — без замечаний', () => {
    expect(findAll(doc('phone: +7 999 123-45-67\ncontacts:\n  telegram: ivan'), 'unknown-field')).toEqual([])
  })
})

describe('unknown-field: «возможно, вы имели в виду»', () => {
  it.each([
    ['опечатка в шапке', doc('phon: +7 999 123-45-67'), 'phone'],
    ['поле по-русски', doc('телефон: +7 999 123-45-67'), 'phone'],
    ['поле с заглавной буквы', doc('City: Самара'), 'city'],
    ['опечатка в contacts', doc('contacts:\n  telegramm: ivan'), 'telegram'],
    ['сокращение в contacts', doc('contacts:\n  tg: ivan'), 'telegram'],
    ['мессенджер по-русски', doc('contacts:\n  ватсап: +79991234567'), 'whatsapp'],
    ['опечатка в ссылке', doc('links:\n  - label: A\n    urll: https://a.ru'), 'url'],
    ['опечатка в поле блока', doc('', ':::cards\ntitel: A\n:::'), 'title'],
    ['опечатка в поле после другого поля', doc('', ':::cards\ntitle: A\ndescriptoin: Б\n:::'), 'description'],
  ])('%s → %s', (_, text, key) => {
    const d = findOne(text, 'unknown-field')
    expect(d.message).toContain(`«${key}»`)
    expect(fixAndRecheck(text, d).slice(d.from, d.from + key.length)).toBe(key)
  })

  it('мессенджер в корне шапки — подсказка про contacts', () => {
    const d = findOne(doc('telegram: barber_ivan'), 'unknown-field')
    expect(d.message).toMatch(/внутри contacts/)
    expect(d.fix).toBeUndefined()
  })

  it('непохожее поле — список возможных', () => {
    expect(findOne(doc('price: 1500'), 'unknown-field').message).toMatch(/Возможные поля/)
  })
})

describe('unknown-field: блоки', () => {
  it('неизвестное первое поле элемента', () => {
    const text = doc('', ':::cards\nprice: 1500\n:::')
    const d = findOne(text, 'unknown-field')
    expect(underlined(text, d)).toBe('price')
    expect(d.message).toMatch(/Возможные поля: title/)
  })

  it('«Note: …» в продолжении текста — исправление присоединяет строку', () => {
    const text = doc('', ':::accordion\ntitle: Вопрос\ncontent: Ответ\nNote: приходите заранее\n:::')
    const d = findOne(text, 'unknown-field')
    expect(d.message).toMatch(/продолжение/)
    const fixed = fixAndRecheck(text, d)
    expect(parseAccordion(fixed)).toEqual([{ title: 'Вопрос', content: 'Ответ Note: приходите заранее' }])
  })

  it('ссылка в начале строки', () => {
    const text = doc('', ':::accordion\ntitle: Где вы?\ncontent: Пишите\nhttps://t.me/anna\n:::')
    const d = findOne(text, 'unknown-field')
    expect(d.message).toMatch(/Ссылка/)
    expect(parseAccordion(fixAndRecheck(text, d))[0].content).toBe('Пишите https://t.me/anna')
  })

  it('у блока code полей нет — не проверяется', () => {
    expect(findAll(doc('', ':::code\nconst a: number = 1\n:::'), 'unknown-field')).toEqual([])
  })
})

describe('duplicate-field', () => {
  it('забыта пустая строка между элементами — исправление её добавляет', () => {
    const text = doc('', ':::accordion\ntitle: Первый\ncontent: Да\ntitle: Второй\ncontent: Нет\n:::')
    const d = findAll(text, 'duplicate-field')[0]
    expect(underlined(text, d)).toBe('title')
    const fixed = fixAndRecheck(text, d)
    expect(parseAccordion(fixed)).toHaveLength(2)
  })
})
