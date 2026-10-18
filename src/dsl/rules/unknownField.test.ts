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

describe('unknown-field: блоки', () => {
  it('неизвестное первое поле элемента', () => {
    const text = doc('', ':::cards\ntitel: A\n:::')
    expect(underlined(text, findOne(text, 'unknown-field'))).toBe('titel')
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
