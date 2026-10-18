import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, underlined } from './testHelpers.ts'

describe('unknown-block', () => {
  it('подчёркивает имя блока и перечисляет доступные', () => {
    const text = doc('', ':::faq\ntitle: В\n:::')
    const d = findOne(text, 'unknown-block')
    expect(underlined(text, d)).toBe('faq')
    expect(d.message).toMatch(/:::cards.*:::accordion.*:::code/)
  })

  it('имя без учёта регистра', () => {
    expect(findAll(doc('', ':::CARDS\ntitle: A\n:::'), 'unknown-block')).toEqual([])
  })
})
