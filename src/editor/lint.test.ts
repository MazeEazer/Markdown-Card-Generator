import { describe, expect, it } from 'vitest'
import type { Diagnostic } from '../dsl/types'
import { validate } from '../dsl/validate'
import { toEditorDiagnostics } from './lint'

const diagnostic = (patch: Partial<Diagnostic>): Diagnostic => ({
  from: 0,
  to: 1,
  severity: 'error',
  code: 'test',
  message: 'Сообщение',
  ...patch,
})

describe('toEditorDiagnostics', () => {
  it('переносит позицию, важность и сообщение без изменений', () => {
    const result = toEditorDiagnostics([diagnostic({ from: 3, to: 8, severity: 'warning', message: 'Нет телефона' })], 20)
    expect(result).toEqual([{ from: 3, to: 8, severity: 'warning', message: 'Нет телефона' }])
  })

  it('прижимает диапазон к длине документа', () => {
    expect(toEditorDiagnostics([diagnostic({ from: 15, to: 30 })], 10)).toEqual([
      expect.objectContaining({ from: 10, to: 10 }),
    ])
    expect(toEditorDiagnostics([diagnostic({ from: -2, to: 4 })], 10)).toEqual([
      expect.objectContaining({ from: 0, to: 4 }),
    ])
  })

  it('конец диапазона не раньше начала', () => {
    expect(toEditorDiagnostics([diagnostic({ from: 5, to: 2 })], 10)).toEqual([
      expect.objectContaining({ from: 5, to: 5 }),
    ])
  })

  it('подчёркивает именно тот текст, на который указал валидатор', () => {
    const text = '---\nname: Барбершоп\nphone: 12345\nfoo: 1\n---\n'
    const marked = toEditorDiagnostics(validate(text), text.length).map((d) => [d.severity, text.slice(d.from, d.to)])
    expect(marked).toEqual([
      ['warning', '12345'],
      ['warning', 'foo'],
    ])
  })
})
