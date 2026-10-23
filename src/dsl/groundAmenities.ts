// Проверка удобств по описанию: удобство остаётся, только если описание его называет (фразы — в schema/amenities.ts).
// Только для AI-генерации (generate.ts): на коротком описании модель дописывала «парковку» и «Wi-Fi» по примеру промпта.
// Числа в уточнении («10 мест») тоже сверяются с описанием: нет числа — убирается уточнение, удобство остаётся.
import { applyCuts, itemLines } from './cuts.ts'
import { parseDocument } from './parser.ts'
import { AMENITIES, type AmenityKey } from './schema/amenities.ts'
import type { Range } from './types.ts'

/** Код в журнале (fixed_codes): удалено удобство, которого нет в описании. */
export const UNGROUNDED_AMENITY = 'ungrounded-amenity'
/** Код в журнале: убрано уточнение удобства с числом, которого нет в описании. */
export const UNGROUNDED_AMENITY_TEXT = 'ungrounded-amenity-text'

export interface GroundAmenitiesResult {
  text: string
  removed: string[]
}

const numbersIn = (text: string) => new Set(text.match(/\d+/g)?.map((n) => String(Number(n))) ?? [])

export function groundAmenities(text: string, description: string): GroundAmenitiesResult {
  const ast = parseDocument(text)
  const lower = description.toLowerCase().replace(/ё/g, 'е')
  const descNumbers = numbersIn(description)
  const cuts: Range[] = []
  const removed: string[] = []

  for (const block of ast.sections.flatMap((section) => section.blocks)) {
    if (block.name !== 'amenities') continue
    for (const item of block.items) {
      const key = item.fields.find((f) => f.key === 'key')?.value.trim()
      const definition = key ? AMENITIES[key as AmenityKey] : undefined
      // Неизвестный key — ошибка валидатора, модель исправит; здесь его не трогаем
      if (!definition) continue

      if (!definition.phrases.some((phrase) => phrase.test(lower))) {
        cuts.push(itemLines(text, item.from, item.to))
        removed.push(UNGROUNDED_AMENITY)
        continue
      }
      const note = item.fields.find((f) => f.key === 'text')
      if (note && [...numbersIn(note.value)].some((n) => !descNumbers.has(n))) {
        cuts.push({ from: text.lastIndexOf('\n', note.from - 1) + 1, to: (text.indexOf('\n', note.to - 1) + 1) || text.length })
        removed.push(UNGROUNDED_AMENITY_TEXT)
      }
    }
  }

  const result = applyCuts(text, cuts)
  return { text: result, removed }
}
