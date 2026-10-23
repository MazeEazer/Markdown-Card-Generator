// Город в шапке: модель не написала city, хотя город назван в описании («Фотограф Олег, Тула»). Только для
// AI-генерации (generate.ts). Если title состоит только из названия города — модель положила город не в то поле:
// title убирается (сайту нужен подзаголовок, а не повтор города).
import { findCity, isCityOnly } from './cities.ts'
import { parseDocument } from './parser.ts'
import { setFrontmatterField } from './profiles/apply.ts'
import { wholeLines } from './cuts.ts'

/** Коды в журнале (fixed_codes). */
export const CITY_FILLED = 'city-filled'
export const TITLE_IS_CITY = 'title-is-city'

export interface FillCityResult {
  text: string
  applied: string[]
}

export function fillCity(text: string, description: string): FillCityResult {
  const city = findCity(description)
  const frontmatter = parseDocument(text).frontmatter
  if (!city || !frontmatter) return { text, applied: [] }
  const has = (key: string) => {
    const value = frontmatter.data[key]
    return typeof value === 'string' && value.trim() !== ''
  }
  let result = text
  const applied: string[] = []
  // city (и устаревшее location) пусты — ставим город из описания
  if (!has('city') && !has('location')) {
    result = setFrontmatterField(result, 'city', city)
    applied.push(CITY_FILLED)
  }
  const title = parseDocument(result).frontmatter?.fields.find((f) => f.key === 'title')
  if (title?.valueRange && isCityOnly(String(title.value ?? ''), city)) {
    const line = wholeLines(result, title.keyRange.from, title.valueRange.to)
    result = result.slice(0, line.from) + result.slice(line.to)
    applied.push(TITLE_IS_CITY)
  }
  return { text: result, applied }
}
