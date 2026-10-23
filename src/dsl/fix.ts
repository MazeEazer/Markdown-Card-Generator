import { toCardData } from './cardData.ts'
import { parseDocument } from './parser.ts'
import type { Diagnostic } from './types.ts'
import { validate } from './validate.ts'

/** Правка, которую делает автоисправление: заменить текст [from, to) на insert. Без fix — null. */
export function fixChange(diagnostic: Diagnostic): { from: number; to: number; insert: string } | null {
  const { fix } = diagnostic
  if (!fix) return null
  return { from: fix.from ?? diagnostic.from, to: fix.to ?? diagnostic.to, insert: fix.replace }
}

/** Применяет автоисправление диагностики к тексту. Без fix текст не меняется. */
export function applyFix(text: string, diagnostic: Diagnostic): string {
  const change = fixChange(diagnostic)
  if (!change) return text
  return text.slice(0, change.from) + change.insert + text.slice(change.to)
}

export interface FixAllOptions {
  /** Коды, которые не исправлять: например, вставку заглушки «Моё название» вместо настоящего названия */
  skip?: ReadonlySet<string>
  /** Применять и догадки (fix.guess) — по умолчанию нет: без человека неясно, что имелось в виду */
  guesses?: boolean
  /** Предел проходов: после правки валидатор может найти новое, тоже исправимое */
  maxRounds?: number
}

export interface FixAllResult {
  text: string
  /** Применённые исправления по порядку проходов — для журнала и отчёта */
  applied: Diagnostic[]
}

/** Правки пересекаются: общий кусок текста или две вставки в одну точку (неясен порядок). */
function overlaps(a: { from: number; to: number }, b: { from: number; to: number }): boolean {
  if (a.from === a.to && b.from === b.to) return a.from === b.from
  return a.from < b.to && b.from < a.to
}

/**
 * Применяет все автоисправления валидатора, пока они находятся. За проход — только непересекающиеся
 * правки; пересёкшиеся валидатор найдёт заново на следующем проходе, уже в исправленном тексте.
 */
export function applyAllFixes(text: string, { skip, guesses = false, maxRounds = 10 }: FixAllOptions = {}): FixAllResult {
  const applied: Diagnostic[] = []
  const seen = new Set([text])

  for (let round = 0; round < maxRounds; round++) {
    const candidates = validate(text)
      .filter((d) => d.fix && (guesses || !d.fix.guess) && !skip?.has(d.code))
      .map((d) => ({ diagnostic: d, change: fixChange(d)! }))
      .sort((a, b) => a.change.from - b.change.from || a.change.to - b.change.to)

    const chosen: typeof candidates = []
    for (const candidate of candidates) {
      if (chosen.some((c) => overlaps(c.change, candidate.change))) continue
      chosen.push(candidate)
    }
    if (!chosen.length) break

    // С конца к началу — смещения ещё не применённых правок не сдвигаются
    let next = text
    for (const { change } of [...chosen].reverse()) next = next.slice(0, change.from) + change.insert + next.slice(change.to)
    // Правка ничего не дала или вернула уже виденный текст — дальше будет то же самое
    if (seen.has(next)) break
    seen.add(next)
    text = next
    applied.push(...chosen.map((c) => c.diagnostic))
  }

  return { text, applied }
}

/** Код в журнале (fixed_codes): в документ добавлен раздел «Как добраться» с картой. */
export const MAP_ADDED = 'map-added'

const MAP_SECTION = '## Как добраться\n:::map\n:::\n'

export interface AddMapResult {
  text: string
  /** [MAP_ADDED], если карта добавлена, иначе [] — для fixed_codes журнала */
  added: string[]
}

/**
 * Только для AI-генерации (generate.ts): в шапке есть адрес, а карты в документе нет — добавляет раздел
 * «Как добраться» с :::map перед «Контактами» (а если их нет — в конец). Нейросеть часто забывает карту, хотя
 * адрес дан; в редакторе человек решает сам. Вызывать после проверки по описанию: адрес в шапке должен быть настоящим.
 */
export function addMissingMap(text: string): AddMapResult {
  const ast = parseDocument(text)
  const card = toCardData(ast).data
  if (!card?.address?.trim()) return { text, added: [] }
  if (ast.sections.some((section) => section.blocks.some((block) => block.name === 'map'))) return { text, added: [] }

  const contacts =
    ast.sections.find((section) => section.blocks.some((block) => block.name === 'contacts')) ??
    ast.sections.find((section) => /^контакт/i.test(section.title.trim()))
  const at = contacts ? contacts.from : text.length
  const before = text.slice(0, at)
  const gap = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const after = contacts ? `\n${text.slice(at)}` : ''
  return { text: `${before}${gap}${MAP_SECTION}${after}`, added: [MAP_ADDED] }
}
