import { describe, expect, it } from 'vitest'
import type { HoursRow } from '../types/card.ts'
import { formatDays, formatHoursLine, hoursStatus, parseDays, parseHoursBody, parseHoursLine, parseTime } from './hours.ts'

describe('parseDays', () => {
  it.each([
    ['пн', [0]],
    ['Пн.', [0]],
    ['понедельник', [0]],
    ['пн–пт', [0, 1, 2, 3, 4]],
    ['пн - пт', [0, 1, 2, 3, 4]],
    ['Понедельник — пятница', [0, 1, 2, 3, 4]],
    ['пн, ср, пт', [0, 2, 4]],
    ['сб и вс', [5, 6]],
    ['суббота', [5]],
    ['воскресенье', [6]],
    ['ежедневно', [0, 1, 2, 3, 4, 5, 6]],
    ['без выходных', [0, 1, 2, 3, 4, 5, 6]],
    ['будни', [0, 1, 2, 3, 4]],
    ['выходные', [5, 6]],
    ['будни, сб', [0, 1, 2, 3, 4, 5]],
    ['пт–пн', [0, 4, 5, 6]],
    ['mon-fri', [0, 1, 2, 3, 4]],
  ])('%s', (text, days) => {
    expect(parseDays(text)).toEqual(days)
  })

  it.each(['понедельникк-', 'завтра', 'пн-вт-ср', ''])('%j — не понятно', (text) => {
    expect(parseDays(text)).toBeNull()
  })
})

describe('parseTime', () => {
  it.each([
    ['10:00–20:00', { open: '10:00', close: '20:00' }],
    ['10:00 - 20:00', { open: '10:00', close: '20:00' }],
    ['10-20', { open: '10:00', close: '20:00' }],
    ['9.30–18.30', { open: '09:30', close: '18:30' }],
    ['с 9 до 21', { open: '09:00', close: '21:00' }],
    ['10:00–24:00', { open: '10:00', close: '24:00' }],
    ['выходной', 'closed'],
    ['Выходной.', 'closed'],
    ['закрыто', 'closed'],
    ['круглосуточно', 'allDay'],
  ])('%s', (text, expected) => {
    expect(parseTime(text)).toEqual(expected)
  })

  it.each(['10', '25:00–26:00', '10:70–20:00', 'утром', '24:30–25:00'])('%j — не понятно', (text) => {
    expect(parseTime(text)).toBeNull()
  })
})

describe('parseHoursLine', () => {
  it.each<[string, HoursRow]>([
    ['пн–пт: 10:00–20:00', { days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' }],
    ['пн-пт 10-20', { days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' }],
    ['пн-пт:10-20', { days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' }],
    ['ежедневно с 9 до 21', { days: [0, 1, 2, 3, 4, 5, 6], open: '09:00', close: '21:00' }],
    ['вс: выходной', { days: [6], closed: true }],
    ['вс выходной', { days: [6], closed: true }],
    ['сб, вс: круглосуточно', { days: [5, 6], allDay: true }],
    ['круглосуточно', { days: [0, 1, 2, 3, 4, 5, 6], allDay: true }],
  ])('%s', (line, row) => {
    expect(parseHoursLine(line)).toEqual({ ok: true, row })
  })

  it.each([
    ['работаем всегда', 'format'],
    ['завтра: 10:00–20:00', 'days'],
    ['пн–пт: утром', 'time'],
  ])('%s → проблема %s', (line, problem) => {
    expect(parseHoursLine(line)).toMatchObject({ ok: false, problem })
  })
})

describe('parseHoursBody', () => {
  it('пропускает пустые и непонятные строки', () => {
    expect(parseHoursBody('пн–пт: 10–20\n\nчто-то\nвс: выходной')).toEqual([
      { days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' },
      { days: [6], closed: true },
    ])
  })
})

describe('formatDays / formatHoursLine', () => {
  it.each([
    [[0, 1, 2, 3, 4], 'пн–пт'],
    [[0, 2, 4], 'пн, ср, пт'],
    [[5, 6], 'сб, вс'],
    [[0, 1, 2, 4, 5], 'пн–ср, пт, сб'],
    [[0, 1, 2, 3, 4, 5, 6], 'ежедневно'],
  ])('%j → %s', (days, text) => {
    expect(formatDays(days)).toBe(text)
  })

  it('строка в правильной записи разбирается обратно в то же', () => {
    for (const line of ['пн–пт: 9:00–20:00', 'вс: выходной', 'ежедневно: круглосуточно', 'пн, ср, пт: 10:30–18:00']) {
      const result = parseHoursLine(line)
      expect(result.ok && formatHoursLine(result.row)).toBe(line)
    }
  })
})

describe('hoursStatus', () => {
  const rows = parseHoursBody('пн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной')
  const at = (weekday: number, time: string) => {
    const [h, m] = time.split(':').map(Number)
    return hoursStatus(rows, weekday, h * 60 + m)
  }

  it.each([
    [0, '12:00', true, 'Открыто до 20:00'],
    [0, '09:30', false, 'Закрыто, откроемся в 10:00'],
    [0, '20:00', false, 'Закрыто, откроемся завтра в 10:00'],
    [4, '21:00', false, 'Закрыто, откроемся завтра в 11:00'],
    [5, '19:00', false, 'Закрыто, откроемся в пн в 10:00'],
    [6, '12:00', false, 'Закрыто, откроемся завтра в 10:00'],
  ])('день %i, %s → %s', (weekday, time, open, text) => {
    expect(at(weekday, time)).toEqual({ open, text })
  })

  it('круглосуточно', () => {
    expect(hoursStatus(parseHoursBody('круглосуточно'), 3, 200)).toEqual({ open: true, text: 'Открыто круглосуточно' })
  })

  it('работа после полуночи', () => {
    const night = parseHoursBody('пт: 22:00–02:00')
    expect(hoursStatus(night, 4, 23 * 60)).toEqual({ open: true, text: 'Открыто до 2:00' })
    expect(hoursStatus(night, 5, 60)).toEqual({ open: true, text: 'Открыто до 2:00' })
    expect(hoursStatus(night, 5, 3 * 60).open).toBe(false)
  })

  it('без часов — «Закрыто»', () => {
    expect(hoursStatus([], 0, 600)).toEqual({ open: false, text: 'Закрыто' })
  })

  it('исходный код функции работает сам по себе — так он встраивается в экспорт', () => {
    const standalone = new Function(`return (${hoursStatus.toString()})`)() as typeof hoursStatus
    for (const [weekday, minutes] of [[0, 720], [5, 1140], [6, 0], [2, 600]]) {
      expect(standalone(rows, weekday, minutes)).toEqual(hoursStatus(rows, weekday, minutes))
    }
  })
})
