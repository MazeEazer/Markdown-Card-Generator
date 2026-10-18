import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('unknown-block', () => {
  it('подчёркивает имя блока и перечисляет доступные', () => {
    const text = doc('', ':::prices\nСтрижка 1500\n:::')
    const d = findOne(text, 'unknown-block')
    expect(underlined(text, d)).toBe('prices')
    expect(d.message).toMatch(/:::cards.*:::accordion.*:::code/)
    expect(d.fix).toBeUndefined()
  })

  it.each([
    ['card', 'cards'],
    ['acordion', 'accordion'],
    ['faq', 'accordion'],
  ])('опечатка :::%s → :::%s', (typo, name) => {
    const text = doc('', `:::${typo}\ntitle: A\ncontent: Б\n:::`)
    const d = findOne(text, 'unknown-block')
    expect(d.message).toContain(`«:::${name}»`)
    expect(fixAndRecheck(text, d)).toContain(`:::${name}\n`)
  })

  it('имя без учёта регистра', () => {
    expect(findAll(doc('', ':::CARDS\ntitle: A\n:::'), 'unknown-block')).toEqual([])
  })
})
