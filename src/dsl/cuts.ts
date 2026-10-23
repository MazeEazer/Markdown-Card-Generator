// Вырезание кусков текста для проверок по описанию (groundAmenities.ts, groundReviews.ts).
import type { Range } from './types.ts'

/** Строки целиком вокруг [from, to). */
export function wholeLines(text: string, from: number, to: number): Range {
  const start = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', Math.max(from, to - 1))
  return { from: start, to: newline === -1 ? text.length : newline + 1 }
}

/** Элемент блока целиком и одна пустая строка между элементами: после, а у последнего элемента — перед. */
export function itemLines(text: string, from: number, to: number): Range {
  const lines = wholeLines(text, from, to)
  let { from: start, to: end } = lines
  if (text[end] === '\n') end++
  else if (start >= 2 && text[start - 2] === '\n') start--
  return { from: start, to: end }
}

/** Удаляет диапазоны; пересекающиеся (соседние элементы делят пустую строку) склеиваются. */
export function applyCuts(text: string, cuts: Range[]): string {
  const merged: Range[] = []
  for (const cut of [...cuts].sort((a, b) => a.from - b.from)) {
    const last = merged.at(-1)
    if (last && cut.from < last.to) last.to = Math.max(last.to, cut.to)
    else merged.push({ ...cut })
  }
  let result = text
  for (const { from, to } of merged.reverse()) result = result.slice(0, from) + result.slice(to)
  return result
}
