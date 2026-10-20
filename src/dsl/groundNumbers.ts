// Проверка чисел по описанию: цены, длительности услуг и часы работы. Только для AI-генерации (generate.ts).
// На коротком описании («Маникюр тольятти») GigaChat-3-Lightning дописывал цены «1500 / от 800», «60 мин» и
// часы «пн–пт: 10:00–20:00» — по примерам промпта. Правила консервативные: ложное удаление настоящих данных
// хуже пропущенной выдумки, поэтому сомнение — в пользу ответа.
import { parseHoursBody } from './hours.ts'
import { parseDocument } from './parser.ts'
import { parseRussianPhone } from './phone.ts'
import type { Range } from './types.ts'

/** Код в журнале (fixed_codes): удалена цена, длительность или блок часов, которых нет в описании. */
export const UNGROUNDED_NUMBER = 'ungrounded-number'

export interface GroundNumbersResult {
  text: string
  removed: string[]
}

/** Числа в тексте: «1500», «1 500» и «40 000» (как одно число), «1,5». */
function numbersIn(text: string): Set<string> {
  const numbers = new Set<string>()
  for (const m of text.matchAll(/\d{1,3}(?:[  ]\d{3})+(?!\d)/g)) numbers.add(m[0].replace(/\D/g, ''))
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    numbers.add(m[0].replace(',', '.'))
    for (const part of m[0].split(/[.,]/)) numbers.add(String(Number(part)))
  }
  return numbers
}

/** Что известно из описания: числа (без телефонов — их цифры не цены и не часы) и слова о времени. */
function descriptionFacts(description: string) {
  const withoutPhones = description.replace(/\+?\d[\d\s().-]{6,}\d/g, (run) =>
    parseRussianPhone(run) || run.replace(/\D/g, '').length >= 10 ? ' ' : run,
  )
  const lower = withoutPhones.toLowerCase()
  return {
    numbers: numbersIn(withoutPhones),
    hasHour: /(?<![\p{L}])час/u.test(lower),
    hasHalfHour: /полчаса/.test(lower),
    allDay: /круглосуточ|24\s*\/\s*7|24 часа/.test(lower),
    text: lower,
  }
}

type Facts = ReturnType<typeof descriptionFacts>

/** Цена: каждое число в ней есть в описании. Без чисел («бесплатно», «договорная») — оставляем. */
function priceGrounded(facts: Facts, value: string): boolean {
  const numbers = [...value.matchAll(/\d{1,3}(?:[  ]\d{3})+(?!\d)|\d+/g)].map((m) => m[0].replace(/\D/g, ''))
  return numbers.every((n) => facts.numbers.has(n))
}

/** Длительность: число есть в описании как есть или в другой единице; «час» = 60 мин. */
function durationGrounded(facts: Facts, value: string): boolean {
  const lower = value.toLowerCase()
  const number = lower.match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.')
  const hours = /час/.test(lower)
  if (!number) {
    if (/полчаса/.test(lower)) return facts.hasHalfHour || facts.numbers.has('30')
    // «час» без числа — это 60 минут
    if (hours) return facts.hasHour || facts.numbers.has('60')
    return true
  }
  const minutes = hours ? Number(number) * 60 : Number(number)
  if (facts.numbers.has(number) || facts.numbers.has(String(minutes))) return true
  // «60 мин», а в описании «час съёмки»; «2 часа», а в описании «120 минут»
  if (minutes % 60 === 0 && facts.hasHour && (minutes === 60 || facts.numbers.has(String(minutes / 60)))) return true
  return false
}

/** Время «HH:MM»: час h есть в описании как h или как h−12 («до 8ми» → 20:00); минуты, если не :00, — тоже. */
function timeGrounded(facts: Facts, time: string): boolean {
  const [h, m] = time.split(':').map(Number)
  if (h === 24 || (h === 0 && m === 0)) return facts.numbers.has('24') || facts.numbers.has('0') || facts.allDay
  const hourOk = facts.numbers.has(String(h)) || (h > 12 && facts.numbers.has(String(h - 12)))
  if (!hourOk) return false
  if (m === 0) return true
  const mm = String(m).padStart(2, '0')
  return new RegExp(`(?<!\\d)(?:${h}|${h > 12 ? h - 12 : h})[:.\\s]${mm}(?!\\d)`).test(facts.text)
}

/** Строки целиком вокруг [from, to). */
function wholeLines(text: string, from: number, to: number): Range {
  const start = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', Math.max(from, to - 1))
  return { from: start, to: newline === -1 ? text.length : newline + 1 }
}

export function groundNumbers(text: string, description: string): GroundNumbersResult {
  const facts = descriptionFacts(description)
  const ast = parseDocument(text)
  const cuts: Range[] = []
  const removed: string[] = []

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      if (block.name === 'services') {
        for (const item of block.items) {
          for (const field of item.fields) {
            const ok = field.key === 'price' ? priceGrounded(facts, field.value) : field.key === 'duration' ? durationGrounded(facts, field.value) : true
            if (!ok) {
              cuts.push(wholeLines(text, field.from, field.to))
              removed.push(UNGROUNDED_NUMBER)
            }
          }
        }
      } else if (block.name === 'hours') {
        // Часы подтверждаются целиком или не показываются: половина расписания хуже, чем никакого
        const rows = parseHoursBody(text.slice(block.bodyRange.from, block.bodyRange.to))
        const ok = rows.every((row) => {
          if (row.closed) return true
          if (row.allDay) return facts.allDay || facts.numbers.has('24')
          return [row.open, row.close].every((time) => !time || timeGrounded(facts, time))
        })
        // Очищаем тело: пустые часы (hours-empty) затем убирает prune — вместе с разделом, если в нём больше ничего нет
        if (!ok && block.bodyRange.to > block.bodyRange.from) {
          cuts.push(wholeLines(text, block.bodyRange.from, block.bodyRange.to))
          removed.push(UNGROUNDED_NUMBER)
        }
      }
    }
  }

  let result = text
  for (const { from, to } of cuts.sort((a, b) => b.from - a.from)) result = result.slice(0, from) + result.slice(to)
  return { text: result, removed }
}
