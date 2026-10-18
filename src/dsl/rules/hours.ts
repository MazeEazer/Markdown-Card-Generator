// Часы работы: каждая строка понятна, закрытие позже открытия, день не указан дважды, все дни недели на месте.
import { formatDays, formatHoursLine, formatTime, parseHoursLine } from '../hours.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { blockLines } from './helpers.ts'

const EXAMPLE = 'например «пн–пт: 10:00–20:00» или «вс: выходной»'

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

export const hoursRule: Rule = ({ text, ast }) => {
  const diagnostics: Diagnostic[] = []

  for (const block of ast.sections.flatMap((section) => section.blocks)) {
    if (block.name !== 'hours') continue
    const lines = blockLines(text, block).filter((line) => line.text.trim())

    if (!lines.length) {
      diagnostics.push({
        ...block.nameRange,
        severity: 'warning',
        code: 'hours-empty',
        message: `В блоке часов работы пусто: напишите по строке на дни, ${EXAMPLE}`,
      })
      continue
    }

    const seen = new Set<number>()
    for (const line of lines) {
      const lead = line.text.length - line.text.trimStart().length
      const range = { from: line.from + lead, to: line.from + line.text.trimEnd().length }
      const result = parseHoursLine(line.text)

      if ('problem' in result) {
        const message =
          result.problem === 'days'
            ? `Не понял дни «${result.days}»: пишите пн, вт, ср, чт, пт, сб, вс, диапазон «пн–пт» или «ежедневно»`
            : result.problem === 'time'
              ? `Не понял время «${result.time}»: пишите «10:00–20:00», «выходной» или «круглосуточно»`
              : `Строка часов работы — это дни, двоеточие и время, ${EXAMPLE}`
        diagnostics.push({ ...range, severity: 'warning', code: 'hours-syntax', message })
        continue
      }

      const { row } = result
      if (row.open && row.close && toMinutes(row.close) <= toMinutes(row.open)) {
        // «10:00–8:00» почти всегда значит «до 20:00»: +12 часов дают время позже открытия
        const evening = toMinutes(row.close) + 12 * 60
        const fixed =
          evening > toMinutes(row.open) && evening <= 24 * 60
            ? `${String(Math.floor(evening / 60)).padStart(2, '0')}:${row.close.slice(3)}`
            : null
        diagnostics.push({
          ...range,
          severity: 'warning',
          code: 'hours-close-before-open',
          message: fixed
            ? `Закрытие (${formatTime(row.close)}) раньше открытия (${formatTime(row.open)}). Может быть, до ${formatTime(fixed)}?`
            : `Закрытие (${formatTime(row.close)}) не позже открытия (${formatTime(row.open)}). Если работаете после полуночи — всё верно, иначе проверьте время`,
          fix: fixed ? { label: `Заменить на ${formatTime(fixed)}`, replace: formatHoursLine({ ...row, close: fixed }) } : undefined,
        })
      }

      const repeated = row.days.filter((day) => seen.has(day))
      if (repeated.length) {
        diagnostics.push({
          ...range,
          severity: 'warning',
          code: 'hours-day-twice',
          message: `${formatDays(repeated)} — уже есть выше: на сайте будет показано время из этой строки`,
        })
      }
      row.days.forEach((day) => seen.add(day))
    }

    // Пропущенные дни — только если все строки поняты: иначе причина, скорее всего, в непонятой строке
    const missing = [0, 1, 2, 3, 4, 5, 6].filter((day) => !seen.has(day))
    const allParsed = lines.every((line) => parseHoursLine(line.text).ok)
    if (missing.length && allParsed) {
      diagnostics.push({
        ...block.nameRange,
        severity: 'info',
        code: 'hours-day-missing',
        message: `Не указаны дни: ${formatDays(missing)}. Если в эти дни вы не работаете, добавьте строку «${formatDays(missing)}: выходной»`,
      })
    }
  }

  return diagnostics
}
