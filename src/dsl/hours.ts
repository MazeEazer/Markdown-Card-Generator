// Часы работы по-русски: «пн–пт: 10:00–20:00», «сб: 11–18», «вс: выходной», «ежедневно с 9 до 21».
import type { HoursRow } from '../types/card.ts'

/** Варианты написания дней: короткие формы и начала полных названий (понедельник, среда, суббота…). */
const DAY_FORMS: { short: string[]; stems: string[] }[] = [
  { short: ['пн', 'mon'], stems: ['пон'] },
  { short: ['вт', 'tue'], stems: ['втор'] },
  { short: ['ср', 'wed'], stems: ['сре', 'сред'] },
  { short: ['чт', 'thu'], stems: ['чет'] },
  { short: ['пт', 'fri'], stems: ['пят'] },
  { short: ['сб', 'sat'], stems: ['суб'] },
  { short: ['вс', 'sun'], stems: ['вос', 'вск'] },
]

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Слова, означающие сразу несколько дней. */
const DAY_GROUPS: [RegExp, number[]][] = [
  [/^(ежедневно|каждый день|без выходных|все дни|daily)$/, ALL_DAYS],
  [/^(будни|по будням|рабочие дни|в будни)$/, [0, 1, 2, 3, 4]],
  [/^(выходные|по выходным|в выходные)$/, [5, 6]],
]

const SHORT_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

function dayIndex(token: string): number | null {
  const word = token.replace(/\./g, '').trim().toLowerCase()
  const index = DAY_FORMS.findIndex(
    (forms) => forms.short.includes(word) || forms.stems.some((stem) => word.startsWith(stem)),
  )
  return index === -1 ? null : index
}

/** «пн–пт», «пн, ср, пт», «будни, сб», «понедельник» → номера дней; null — не понятно. */
export function parseDays(text: string): number[] | null {
  const normalized = text.toLowerCase().replace(/[–—]/g, '-').trim()
  if (!normalized) return null
  const days = new Set<number>()

  for (const part of normalized.split(/\s*(?:,|\sи\s)\s*/)) {
    const group = DAY_GROUPS.find(([pattern]) => pattern.test(part))
    if (group) {
      group[1].forEach((day) => days.add(day))
      continue
    }
    const ends = part.split(/\s*-\s*/)
    if (ends.length > 2) return null
    const from = dayIndex(ends[0])
    const to = ends.length === 2 ? dayIndex(ends[1]) : from
    if (from === null || to === null) return null
    // Диапазон может переходить через воскресенье: «пт–пн»
    for (let day = from; ; day = (day + 1) % 7) {
      days.add(day)
      if (day === to) break
    }
  }

  return [...days].sort((a, b) => a - b)
}

type ParsedTime = { open: string; close: string } | 'closed' | 'allDay'

const pad = (hours: number, minutes: number) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

/** «10:00–20:00», «10-20», «с 9 до 21», «выходной», «круглосуточно»; null — не понятно. */
export function parseTime(text: string): ParsedTime | null {
  const normalized = text.toLowerCase().replace(/[–—]/g, '-').replace(/\.$/, '').trim()
  if (/^(выходной|выходн|закрыто|не работаем|нерабочий)/.test(normalized)) return 'closed'
  if (/^(круглосуточно|24\/7|24 часа)$/.test(normalized)) return 'allDay'

  const match = normalized.match(/^(?:с\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|до)\s*(\d{1,2})(?:[:.](\d{2}))?$/)
  if (!match) return null
  const [openH, openM, closeH, closeM] = [match[1], match[2] ?? '0', match[3], match[4] ?? '0'].map(Number)
  const valid = (h: number, m: number) => m < 60 && (h < 24 || (h === 24 && m === 0))
  if (!valid(openH, openM) || !valid(closeH, closeM)) return null
  return { open: pad(openH, openM), close: pad(closeH, closeM) }
}

export type HoursLineResult =
  | { ok: true; row: HoursRow }
  | { ok: false; problem: 'format' | 'days' | 'time'; days?: string; time?: string }

/** Разбирает одну строку блока :::hours. */
export function parseHoursLine(line: string): HoursLineResult {
  const text = line.trim()
  // «круглосуточно» без дней — каждый день
  if (/^(круглосуточно|24\/7)$/i.test(text)) return { ok: true, row: { days: ALL_DAYS, allDay: true } }

  const match =
    text.match(/^(.+?):\s+(.+)$/) ?? // «пн–пт: 10:00–20:00»
    text.match(/^([^\d:]+?)\s*:?\s*((?:с\s*)?\d.*)$/i) ?? // «пн-пт 10-20», «ежедневно с 9 до 21»
    text.match(/^(.+?)\s*:?\s*(выходной|закрыто|круглосуточно)$/i) // «вс выходной»
  if (!match) return { ok: false, problem: 'format' }

  const [, daysText, timeText] = match
  const days = parseDays(daysText)
  if (!days) return { ok: false, problem: 'days', days: daysText.trim() }
  const time = parseTime(timeText)
  if (!time) return { ok: false, problem: 'time', time: timeText.trim() }

  if (time === 'closed') return { ok: true, row: { days, closed: true } }
  if (time === 'allDay') return { ok: true, row: { days, allDay: true } }
  return { ok: true, row: { days, ...time } }
}

/** Строки блока → часы работы (непонятные строки пропускаются — о них предупреждает валидатор). */
export function parseHoursBody(body: string): HoursRow[] {
  return body
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .flatMap((line) => {
      const result = parseHoursLine(line)
      return result.ok ? [result.row] : []
    })
}

/** [0,1,2,3,4] → «пн–пт», [0,2,4] → «пн, ср, пт», все дни → «ежедневно». */
export function formatDays(days: number[]): string {
  if (days.length === 7) return 'ежедневно'
  const parts: string[] = []
  for (let i = 0; i < days.length; ) {
    let j = i
    while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++
    // Три дня подряд и больше — диапазон, два — через запятую
    if (j - i >= 2) parts.push(`${SHORT_NAMES[days[i]]}–${SHORT_NAMES[days[j]]}`)
    else for (let k = i; k <= j; k++) parts.push(SHORT_NAMES[days[k]])
    i = j + 1
  }
  return parts.join(', ')
}

/** «10:00» → «10:00», «09:00» → «9:00». */
export function formatTime(time: string): string {
  return time.replace(/^0(\d)/, '$1')
}

/** Время строки для людей: «10:00–20:00», «выходной», «круглосуточно». */
export function formatHoursTime(row: HoursRow): string {
  if (row.closed) return 'выходной'
  if (row.allDay) return 'круглосуточно'
  return `${formatTime(row.open ?? '')}–${formatTime(row.close ?? '')}`
}

/** Строка блока в правильной записи: «пн–пт: 10:00–20:00». */
export function formatHoursLine(row: HoursRow): string {
  return `${formatDays(row.days)}: ${formatHoursTime(row)}`
}

/**
 * Работает ли бизнес сейчас: «Открыто до 20:00» / «Закрыто, откроемся завтра в 10:00».
 * weekday: 0 — понедельник; minutes — минуты от полуночи по часам посетителя.
 *
 * Функция самодостаточна (без импортов и внешних констант): её исходный код встраивается
 * в экспортированный HTML (hoursStatus.toString()) и пересчитывает бейдж при открытии страницы.
 */
export function hoursStatus(rows: HoursRow[], weekday: number, minutes: number): { open: boolean; text: string } {
  const WHEN = ['в пн', 'во вт', 'в ср', 'в чт', 'в пт', 'в сб', 'в вс']
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  const show = (time: string) => time.replace(/^0(\d)/, '$1')

  // Расписание по дням: следующая строка про тот же день важнее предыдущей
  const schedule: (HoursRow | undefined)[] = []
  for (const row of rows) for (const day of row.days) schedule[day] = row
  const interval = (row: HoursRow | undefined) =>
    row && row.open && row.close && !row.closed && !row.allDay ? { open: toMinutes(row.open), close: toMinutes(row.close), row } : null

  const today = schedule[weekday]
  if (today && today.allDay) return { open: true, text: 'Открыто круглосуточно' }

  // Работа после полуночи: вчерашний интервал «22:00–02:00» ещё идёт
  const yesterday = interval(schedule[(weekday + 6) % 7])
  if (yesterday && yesterday.close < yesterday.open && minutes < yesterday.close) {
    return { open: true, text: `Открыто до ${show(yesterday.row.close!)}` }
  }

  const now = interval(today)
  if (now) {
    const overnight = now.close <= now.open
    if (minutes >= now.open && (overnight || minutes < now.close)) return { open: true, text: `Открыто до ${show(now.row.close!)}` }
    if (minutes < now.open) return { open: false, text: `Закрыто, откроемся в ${show(now.row.open!)}` }
  }

  for (let shift = 1; shift <= 7; shift++) {
    const day = (weekday + shift) % 7
    const when = shift === 1 ? 'завтра' : WHEN[day]
    if (schedule[day] && schedule[day]!.allDay) return { open: false, text: `Закрыто, откроемся ${when}` }
    const next = interval(schedule[day])
    if (next) return { open: false, text: `Закрыто, откроемся ${when} в ${show(next.row.open!)}` }
  }
  return { open: false, text: 'Закрыто' }
}
