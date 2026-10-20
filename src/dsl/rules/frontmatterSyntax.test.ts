import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('frontmatter-not-first', () => {
  it.each([
    ['пустые строки', '\n\n'],
    ['пробелы в начале строки ---', '   '],
    ['строка из пробелов и табов', ' \t \n'],
    ['переводы строк Windows', '\r\n\r\n'],
    ['BOM из блокнота Windows', '\uFEFF'],
  ])('%s перед ---', (_, indent) => {
    const text = `${indent}---\nname: Барбершоп\nphone: +7 999 123-45-67\n---\n## О нас\nТекст`
    const d = findOne(text, 'frontmatter-not-first')
    expect(d.severity).toBe('error')
    expect(underlined(text, d)).toBe('---')
    expect(d.fix!.label).toBe('Убрать пустые строки в начале')
    // «Нет шапки» и прочие ошибки шапки не выдаются — причина одна
    expect(findAll(text, 'missing-frontmatter')).toEqual([])
    expect(findAll(text, 'unclosed-frontmatter')).toEqual([])

    const fixed = fixAndRecheck(text, d)
    expect(fixed.startsWith('---\nname: Барбершоп')).toBe(true)
    expect(parseCardMarkdown(fixed).data!.name).toBe('Барбершоп')
  })

  it('незакрытая шапка с отступом — сначала про отступ', () => {
    const text = '\n---\nname: A\n## О нас'
    expect(findAll(text, 'frontmatter-not-first')).toHaveLength(1)
    expect(findOne(fixAndRecheck(text, findOne(text, 'frontmatter-not-first')), 'unclosed-frontmatter')).toBeDefined()
  })

  it('шапка с первой строки и документ без шапки — не эта ошибка', () => {
    expect(findAll('---\nname: A\n---\n', 'frontmatter-not-first')).toEqual([])
    expect(findAll('\n\n## О нас\nТекст', 'frontmatter-not-first')).toEqual([])
    expect(findAll('Текст\n---\nname: A\n---\n', 'frontmatter-not-first')).toEqual([])
  })
})

describe('unclosed-frontmatter', () => {
  it('шапка без закрывающей ---', () => {
    const text = '---\nname: Анна\n## О себе'
    const d = findOne(text, 'unclosed-frontmatter')
    expect(d.severity).toBe('error')
    expect(underlined(text, d)).toBe('---')
  })

  it('нет шапки вовсе — это другое правило', () => {
    expect(findAll('## О себе', 'unclosed-frontmatter')).toEqual([])
  })
})

describe('invalid-yaml', () => {
  it('ошибка подчёркивает строку, сообщение по-русски', () => {
    const text = '---\nname: [Тест\n---\n'
    const d = findOne(text, 'invalid-yaml')
    expect(underlined(text, d)).toBe('name: [Тест')
    expect(d.message).toMatch(/кавычк|скобк|отступ/)
  })

  it('двоеточие в значении — исправление кавычками', () => {
    const text = '---\nname: Барбершоп\ntitle: Стрижки: мужские и детские\n---\n'
    const d = findOne(text, 'invalid-yaml')
    expect(d.message).toMatch(/двоеточие/)
    expect(fixAndRecheck(text, d)).toContain('title: "Стрижки: мужские и детские"')
  })

  it('табуляция в отступе — исправление пробелами', () => {
    const text = '---\nname: A\ncontacts:\n\ttelegram: ivan\n---\n'
    const d = findOne(text, 'invalid-yaml')
    expect(d.message).toMatch(/Tab/)
    expect(fixAndRecheck(text, d)).toContain('\n  telegram: ivan')
  })

  it('поле дважды', () => {
    const d = findOne('---\nname: A\nname: B\n---\n', 'invalid-yaml')
    expect(d.message).toMatch(/«name».*дважды/)
  })

  it('одна диагностика на строку', () => {
    expect(findAll('---\nname: A\n- x\nb: 1\n---\n', 'invalid-yaml').length).toBeLessThanOrEqual(2)
  })

  it('правильная шапка — без ошибок', () => {
    expect(findAll('---\nname: A\ntitle: "Стрижки: мужские"\n---\n', 'invalid-yaml')).toEqual([])
  })
})

describe('unclosed-frontmatter: «Закрыть шапку»', () => {
  it('--- вставляется после последнего поля перед первым разделом (так пишет GigaChat-3-Lightning)', () => {
    const text = '---\nname: Лапки\ncontacts:\n  telegram: lapki_tlt\n\n## Услуги\n:::services\ntitle: Маникюр\n:::\n'
    const d = findOne(text, 'unclosed-frontmatter')
    expect(d.fix?.guess).toBeUndefined()
    expect(fixAndRecheck(text, d)).toBe('---\nname: Лапки\ncontacts:\n  telegram: lapki_tlt\n---\n\n## Услуги\n:::services\ntitle: Маникюр\n:::\n')
  })

  it('перед блоком без раздела — тоже', () => {
    const text = '---\nname: Лапки\n:::contacts\n:::\n'
    expect(fixAndRecheck(text, findOne(text, 'unclosed-frontmatter'))).toBe('---\nname: Лапки\n---\n:::contacts\n:::\n')
  })

  it('среди полей есть обычный текст — граница неочевидна: исправление-догадка', () => {
    const text = '---\nname: Лапки\nПросто текст про студию\n\n## Услуги\n'
    expect(findOne(text, 'unclosed-frontmatter').fix?.guess).toBe(true)
  })

  it('нет ни раздела, ни блока — исправления нет', () => {
    expect(findOne('---\nname: Лапки\nphone: +7 900 000-00-00\n', 'unclosed-frontmatter').fix).toBeUndefined()
  })
})
