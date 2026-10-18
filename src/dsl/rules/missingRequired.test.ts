import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { findAll, findOne, fixAndRecheck } from './testHelpers.ts'

describe('missing-frontmatter', () => {
  it('нет шапки — ошибка и исправление, после которого сайт строится', () => {
    const text = '## О себе\nТекст'
    const d = findOne(text, 'missing-frontmatter')
    expect(d.severity).toBe('error')
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).error).toBeNull()
  })

  it('пустой документ', () => {
    expect(findOne('', 'missing-frontmatter').fix).toBeDefined()
  })
})

describe('missing-name', () => {
  it('шапка без name — исправление добавляет поле', () => {
    const text = '---\ntitle: Барбер\n---\n'
    const fixed = fixAndRecheck(text, findOne(text, 'missing-name'))
    expect(parseCardMarkdown(fixed).error).toBeNull()
  })

  it('пустое name — без исправления', () => {
    const d = findOne('---\nname: "  "\n---\n', 'missing-name')
    expect(d.fix).toBeUndefined()
  })

  it('при ошибке YAML не дублирует её', () => {
    expect(findAll('---\nname: [x\n---\n', 'missing-name')).toEqual([])
  })
})

describe('missing-item-field', () => {
  it('у вопроса нет ответа', () => {
    const d = findOne('---\nname: A\n---\n:::accordion\ntitle: Вопрос\n:::', 'missing-item-field')
    expect(d.severity).toBe('warning')
    expect(d.message).toMatch(/«content»/)
  })

  it('у карточки нет заголовка', () => {
    expect(findOne('---\nname: A\n---\n:::cards\ndescription: Текст\n:::', 'missing-item-field').message).toMatch(/«title»/)
  })

  it('необязательные поля не требуются', () => {
    expect(findAll('---\nname: A\n---\n:::cards\ntitle: A\n:::', 'missing-item-field')).toEqual([])
  })
})
