import { describe, expect, it } from 'vitest'
import { doc, findAll, findOne, underlined } from './testHelpers.ts'

describe('stray-text', () => {
  it('строка без поля в начале элемента', () => {
    const text = doc('', ':::cards\nПросто текст\ntitle: A\n:::')
    const d = findOne(text, 'stray-text')
    expect(underlined(text, d)).toBe('Просто текст')
    expect(d.message).toMatch(/title: …/)
  })

  it('строки-продолжения поля — не ошибка', () => {
    expect(findAll(doc('', ':::cards\ntitle: A\ndescription: раз\nдва\n:::'), 'stray-text')).toEqual([])
  })

  it('в блоке code и в неизвестном блоке не проверяется', () => {
    expect(findAll(doc('', ':::code\nтекст\n:::\n:::faq\nтекст\n:::'), 'stray-text')).toEqual([])
  })
})
