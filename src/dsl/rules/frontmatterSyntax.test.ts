import { describe, expect, it } from 'vitest'
import { findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

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
