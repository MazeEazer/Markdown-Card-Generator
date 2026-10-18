// Обёртка для фронтенда: разбор DSL живёт в src/dsl/ (общий код с Edge Functions).
import type { ParseResult } from '../types/card'
import { toCardData } from '../dsl/cardData'
import { parseDocument } from '../dsl/parser'

export { FALLBACK_CARD } from '../dsl/cardData'
export {
  detectSectionType,
  parseAccordion,
  parseCardGrid,
  parseCards,
  parseCodeBlock,
  parseTable,
} from '../dsl/sections'

export function parseCardMarkdown(markdown: string): ParseResult {
  try {
    return toCardData(parseDocument(markdown))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка парсинга Markdown'
    return { data: null, error: message }
  }
}
