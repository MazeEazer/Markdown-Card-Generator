import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { contrast } from '../color.ts'
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

describe('accent-low-contrast', () => {
  it('жёлтый на светлой теме (ручной тест 1, minimal) — предупреждение и читаемый оттенок', () => {
    const text = doc('theme: minimal\naccent: "#ffd700"')
    const d = findOne(text, 'accent-low-contrast')
    expect(d.message).toMatch(/контраст 1,4 : 1/)
    const fixed = fixAndRecheck(text, d)
    const accent = parseCardMarkdown(fixed).data!.accent
    expect(contrast(accent, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    // Тот же оттенок — темнее, не другой цвет: красный и зелёный каналы остаются в пропорции жёлтого
    expect(accent).toMatch(/^#[0-9a-f]{6}$/)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(b).toBe(0)
  })

  it('тёмный цвет на тёмной теме noir — осветляется', () => {
    const text = doc('theme: noir\naccent: "#222244"')
    const fixed = fixAndRecheck(text, findOne(text, 'accent-low-contrast'))
    expect(contrast(parseCardMarkdown(fixed).data!.accent, '#14141f')).toBeGreaterThanOrEqual(4.5)
  })

  it('читаемые цвета, auto, тема auto и vercel — без замечаний', () => {
    expect(findAll(doc('theme: minimal\naccent: "#c0392b"'), 'accent-low-contrast')).toEqual([])
    expect(findAll(doc('theme: noir\naccent: "#ffd700"'), 'accent-low-contrast')).toEqual([])
    expect(findAll(doc('theme: minimal\naccent: auto'), 'accent-low-contrast')).toEqual([])
    expect(findAll(doc('accent: "#ffd700"'), 'accent-low-contrast')).toEqual([])
    expect(findAll(doc('theme: vercel\naccent: "#ffd700"'), 'accent-low-contrast')).toEqual([])
  })
})
