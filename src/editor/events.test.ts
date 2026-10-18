import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Diagnostic, Severity } from '../dsl/types'
import { validate } from '../dsl/validate'
import { createLogger, diagnosticCounts, diffDiagnostics, type EditorEvent } from './events'

const d = (code: string, severity: Severity = 'warning'): Diagnostic => ({ from: 0, to: 1, severity, code, message: '' })

describe('diffDiagnostics', () => {
  it('появившиеся и исчезнувшие коды с количеством; позиции не важны', () => {
    const before = diagnosticCounts([d('phone-format'), d('unknown-field'), d('unknown-field')])
    const after = diagnosticCounts([d('unknown-field'), d('unclosed-fence', 'error'), { ...d('unknown-field'), from: 40 }, d('unknown-field')])
    expect(diffDiagnostics(before, after)).toEqual({
      appeared: [
        { code: 'unknown-field', severity: 'warning', count: 1 },
        { code: 'unclosed-fence', severity: 'error', count: 1 },
      ],
      resolved: [{ code: 'phone-format', severity: 'warning', count: 1 }],
    })
  })
})

describe('createLogger', () => {
  let sent: EditorEvent[][]
  const logger = () =>
    createLogger((batch) => sent.push(batch), { settleMs: 1500, flushMs: 5000, maxBatch: 3, now: () => new Date('2026-10-18T12:00:00Z') })
  const events = () => sent.flat().map((e) => [e.event, e.code, e.detail])

  beforeEach(() => {
    sent = []
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('копит события и отправляет пачкой по таймеру', () => {
    const log = logger()
    log.log('completion_shown', 'value', { options: 5 })
    log.log('completion_accepted', 'noir', { kind: 'value' })
    expect(sent).toEqual([])
    vi.advanceTimersByTime(5000)
    expect(sent).toHaveLength(1)
    expect(sent[0][0]).toEqual({ event: 'completion_shown', code: 'value', detail: { options: 5 }, occurred_at: '2026-10-18T12:00:00.000Z' })
  })

  it('большая пачка уходит сразу', () => {
    const log = logger()
    for (let i = 0; i < 3; i++) log.log('hover_shown', 'price', { kind: 'field' })
    expect(sent).toHaveLength(1)
  })

  it('ошибки, которые уже были в тексте при открытии, не считаются появившимися', () => {
    const log = logger()
    log.diagnostics([d('phone-format')])
    log.flush()
    expect(events()).toEqual([])
  })

  it('промежуточные ошибки при наборе не пишутся — только итог после паузы', () => {
    const log = logger()
    log.diagnostics([])
    // Набираем телефон: на каждой цифре ошибка формата, в конце — номер верный
    for (let i = 0; i < 5; i++) {
      log.diagnostics([d('phone-format')])
      vi.advanceTimersByTime(300)
    }
    log.diagnostics([])
    vi.advanceTimersByTime(1500)
    log.flush()
    expect(events()).toEqual([])
  })

  it('ошибка появилась, потом исправлена правкой', () => {
    const log = logger()
    log.diagnostics([])
    log.diagnostics([d('unclosed-fence', 'error')])
    vi.advanceTimersByTime(1500)
    log.diagnostics([])
    vi.advanceTimersByTime(1500)
    log.flush()
    expect(events()).toEqual([
      ['diagnostic_appeared', 'unclosed-fence', { severity: 'error', count: 1 }],
      ['diagnostic_resolved', 'unclosed-fence', { severity: 'error', count: 1, by: 'edit' }],
    ])
  })

  it('исправлена кнопкой — by: fix', () => {
    const log = logger()
    log.diagnostics([d('phone-format')])
    log.noteFix('phone-format')
    log.diagnostics([])
    log.flush()
    expect(events()).toEqual([['diagnostic_resolved', 'phone-format', { severity: 'warning', count: 1, by: 'fix' }]])
  })

  it('открыли другой сайт или загрузили пример — новая точка отсчёта без событий', () => {
    const log = logger()
    log.diagnostics([])
    log.diagnostics([d('unknown-field')])
    log.resetDiagnostics([d('phone-format'), d('unclosed-fence', 'error')])
    vi.advanceTimersByTime(1500)
    log.flush()
    expect(events()).toEqual([])
  })

  it('с настоящим валидатором: незакрытый блок → закрыли', () => {
    const log = logger()
    const base = '---\nname: Борода\nphone: +7 999 123-45-67\n---\n\n## Часы\n'
    log.diagnostics(validate(base))
    log.diagnostics(validate(`${base}:::hours\nежедневно: 10:00–20:00\n`))
    vi.advanceTimersByTime(1500)
    log.diagnostics(validate(`${base}:::hours\nежедневно: 10:00–20:00\n:::\n`))
    log.flush()
    expect(events().map(([event, code]) => [event, code])).toEqual([
      ['diagnostic_appeared', 'unclosed-fence'],
      ['diagnostic_resolved', 'unclosed-fence'],
    ])
  })
})
