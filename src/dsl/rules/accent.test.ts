import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('accent-unquoted', () => {
  it('#abc без кавычек — исправление, после которого цвет применяется', () => {
    const text = doc('accent: #abc')
    const d = findOne(text, 'accent-unquoted')
    expect(underlined(text, d)).toBe('#abc')
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.accent).toBe('#aabbcc')
  })

  it('обычный комментарий после пустого значения — не цвет', () => {
    expect(findAll(doc('accent: # потом выберу'), 'accent-unquoted')).toEqual([])
  })
})

describe('accent-format', () => {
  it.each([
    ['abc', '"#aabbcc"'],
    ['"#abcd"', '"#aabbcc"'],
    ['"#11223344"', '"#112233"'],
    ['123456', '"#123456"'],
    ['"#ff0000 #красный"', '"#ff0000"'],
  ])('accent: %s → %s', (raw, expected) => {
    const text = doc(`accent: ${raw}`)
    expect(fixAndRecheck(text, findOne(text, 'accent-format'))).toContain(`accent: ${expected}`)
  })

  it.each(['"#abc"', '"#C0392B"', 'auto'])('accent: %s — без замечаний', (raw) => {
    expect(validateAccent(doc(`accent: ${raw}`))).toEqual([])
  })
})

describe('invalid-value: accent', () => {
  it('нераспознанный цвет', () => {
    const d = findOne(doc('accent: red'), 'invalid-value')
    expect(d.message).toMatch(/автоматически/)
  })
})

function validateAccent(text: string) {
  return [...findAll(text, 'accent-format'), ...findAll(text, 'accent-unquoted'), ...findAll(text, 'invalid-value')]
}
