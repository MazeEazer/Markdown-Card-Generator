import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

function hours(...lines: string[]): string {
  return doc('phone: +7 999 123-45-67', `## Часы работы\n:::hours\n${lines.join('\n')}\n:::`)
}

const week = ['пн–пт: 10:00–20:00', 'сб: 11:00–18:00', 'вс: выходной']

describe(':::hours — разбор', () => {
  it('строки по-русски → часы работы', () => {
    const data = parseCardMarkdown(hours(...week)).data!
    expect(data.sections[0].type).toBe('hours')
    expect(data.sections[0].hours).toEqual([
      { days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' },
      { days: [5], open: '11:00', close: '18:00' },
      { days: [6], closed: true },
    ])
  })

  it('полная неделя — без замечаний', () => {
    const text = hours(...week)
    expect(findAll(text, 'hours-syntax')).toEqual([])
    expect(findAll(text, 'hours-day-missing')).toEqual([])
  })
})

describe('hours-syntax', () => {
  it.each([
    ['завтра: 10:00–20:00', /Не понял дни «завтра»/],
    ['пн–пт: утром', /Не понял время «утром»/],
    ['работаем всегда', /дни, двоеточие и время/],
  ])('%s', (line, message) => {
    const text = hours(line, 'сб, вс: выходной')
    const d = findOne(text, 'hours-syntax')
    expect(underlined(text, d)).toBe(line)
    expect(d.message).toMatch(message)
  })
})

describe('hours-close-before-open', () => {
  it('«10:00–8:00» — исправление на 20:00', () => {
    const text = hours('пн–пт: 10:00–8:00', 'сб, вс: выходной')
    const d = findOne(text, 'hours-close-before-open')
    expect(d.message).toMatch(/до 20:00\?/)
    expect(fixAndRecheck(text, d)).toContain('пн–пт: 10:00–20:00\n')
  })

  it('работа после полуночи — без исправления', () => {
    const d = findOne(hours('пт, сб: 22:00–02:00', 'пн–чт, вс: выходной'), 'hours-close-before-open')
    expect(d.message).toMatch(/после полуночи/)
    expect(d.fix).toBeUndefined()
  })
})

describe('hours-day-twice', () => {
  it('суббота в двух строках', () => {
    const text = hours('пн–сб: 10–20', 'сб: 11–18', 'вс: выходной')
    const d = findOne(text, 'hours-day-twice')
    expect(underlined(text, d)).toBe('сб: 11–18')
    expect(d.message).toMatch(/^сб — уже есть выше/)
  })
})

describe('hours-day-missing', () => {
  it('нет выходных дней — совет добавить строку', () => {
    const d = findOne(hours('пн–пт: 10–20'), 'hours-day-missing')
    expect(d.severity).toBe('info')
    expect(d.message).toContain('«сб, вс: выходной»')
  })

  it('при непонятной строке не выдаётся', () => {
    expect(findAll(hours('пн–пт: 10–20', 'завтра: 11–18'), 'hours-day-missing')).toEqual([])
  })
})

describe('hours-empty', () => {
  it('пустой блок', () => {
    expect(findOne(hours(), 'hours-empty').message).toMatch(/пн–пт: 10:00–20:00/)
  })
})
