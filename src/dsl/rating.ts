// Оценка в отзыве: целое число от 1 до 5. Владельцы и нейросеть пишут «5/5», «★★★★★», «5 звёзд», «9 из 10».

/** Оценка в правильной записи → число; иначе null. */
export function parseRating(value: string): number | null {
  const text = value.trim()
  return /^[1-5]$/.test(text) ? Number(text) : null
}

/**
 * Правильная оценка, если её можно получить однозначно: «5/5» → 5, «★★★★☆» → 4, «5 звёзд» → 5,
 * «9 из 10» → 5 (по пятибалльной шкале). null — так не получается.
 */
export function normalizeRating(value: string): number | null {
  const text = value.trim().toLowerCase()

  const stars = text.match(/^[★⭐☆✩\s]+$/u)
  if (stars) {
    const filled = [...text].filter((char) => char === '★' || char === '⭐').length
    return filled >= 1 && filled <= 5 ? filled : null
  }

  // «5/5», «4 из 5», «9/10», «4.5/5»
  const scale = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:\/|из)\s*(\d+)$/)
  if (scale) {
    const [score, max] = [Number(scale[1].replace(',', '.')), Number(scale[2])]
    if (max <= 0 || score > max) return null
    const rating = Math.round((score / max) * 5)
    return rating >= 1 ? rating : null
  }

  // «5 звёзд», «4 балла», «4.5» → округляем
  const number = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:зв[её]зд[аы]?|балл(?:а|ов)?|★|⭐)?$/u)
  if (number) {
    const rating = Math.round(Number(number[1].replace(',', '.')))
    return rating >= 1 && rating <= 5 ? rating : null
  }
  return null
}
