import { describe, expect, it } from 'vitest'
import { defaultTemplate } from '../data/defaultTemplate.ts'
import { offsetToLineCol } from './position.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { FRONTMATTER_EXAMPLE } from './schema/frontmatter.ts'
import { validate } from './validate.ts'

describe('validate', () => {
  it('шаблон по умолчанию — без замечаний', () => {
    expect(validate(defaultTemplate)).toEqual([])
  })

  it('пример из схемы со всеми блоками — без замечаний', () => {
    const text = `${FRONTMATTER_EXAMPLE}\n${BLOCK_NAMES.map((name) => `## ${BLOCKS[name].label}\n${BLOCKS[name].example}`).join('\n\n')}\n`
    expect(validate(text)).toEqual([])
  })

  it('диагностики отсортированы по позиции и знают строку', () => {
    const text = '---\nname: A\nphone: +7 999 123-45-67\ntheme: neon\n---\n:::prices\n:::\n##Цены'
    const found = validate(text)
    expect(found.map((d) => d.code)).toEqual(['invalid-value', 'unknown-block', 'heading-no-space'])
    expect(found.map((d) => offsetToLineCol(text, d.from).line)).toEqual([4, 6, 8])
  })

  it('у каждой диагностики сообщение по-русски', () => {
    const text = '---\nname: A\ntheme: neon\naccent: #abc\nphon: 1\n---\n:::cards\nтекст\nicon: x\n'
    const found = validate(text)
    expect(found.length).toBeGreaterThan(3)
    for (const d of found) expect(d.message).toMatch(/[а-яё]/i)
  })
})
