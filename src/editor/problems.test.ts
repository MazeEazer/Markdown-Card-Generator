import { describe, expect, it } from 'vitest'
import type { Diagnostic, Severity } from '../dsl/types'
import { validate } from '../dsl/validate'
import { plural, problemRows, problemsSummary } from './problems'

const of = (...severities: Severity[]): Diagnostic[] =>
  severities.map((severity) => ({ from: 0, to: 1, severity, code: 'test', message: '' }))

describe('plural', () => {
  it.each([
    [1, 'ошибка'],
    [2, 'ошибки'],
    [4, 'ошибки'],
    [5, 'ошибок'],
    [11, 'ошибок'],
    [12, 'ошибок'],
    [21, 'ошибка'],
    [22, 'ошибки'],
    [111, 'ошибок'],
  ])('%i → %s', (n, word) => {
    expect(plural(n, ['ошибка', 'ошибки', 'ошибок'])).toBe(word)
  })
})

describe('problemsSummary', () => {
  it('без проблем', () => {
    expect(problemsSummary([])).toBe('Проблем нет')
  })

  it('считает по важности, сначала ошибки, нулевые не показывает', () => {
    expect(problemsSummary(of('warning', 'error', 'error'))).toBe('2 ошибки · 1 предупреждение')
    expect(problemsSummary(of('info', 'warning', 'warning', 'warning', 'warning', 'warning'))).toBe(
      '5 предупреждений · 1 подсказка',
    )
  })
})

describe('problemRows', () => {
  it('номер строки — как в редакторе, с 1', () => {
    const text = '---\nname: Барбершоп\nphone: 12345\nfoo: 1\n---\n'
    expect(problemRows(text, validate(text)).map((row) => [row.line, row.diagnostic.code])).toEqual([
      [3, 'phone-format'],
      [4, 'unknown-field'],
    ])
  })
})
