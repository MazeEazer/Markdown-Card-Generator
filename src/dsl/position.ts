import type { LineCol } from './types.ts'

/** Смещения начала каждой строки. Строки делятся по `\n`, так что `\r` из CRLF остаётся в конце строки. */
export function lineStarts(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return starts
}

/** Смещение в тексте → строка и колонка (с 1). Смещение за пределами текста прижимается к границам. */
export function offsetToLineCol(text: string, offset: number): LineCol {
  const pos = Math.min(Math.max(offset, 0), text.length)
  const starts = lineStarts(text)

  // Бинарный поиск последней строки, начинающейся не позже pos
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (starts[mid] <= pos) low = mid
    else high = mid - 1
  }

  return { line: low + 1, column: pos - starts[low] + 1 }
}

/** Строка и колонка (с 1) → смещение в тексте. Колонка за концом строки прижимается к её концу. */
export function lineColToOffset(text: string, { line, column }: LineCol): number {
  const starts = lineStarts(text)
  const index = Math.min(Math.max(line, 1), starts.length) - 1
  const lineEnd = index + 1 < starts.length ? starts[index + 1] - 1 : text.length
  return Math.min(starts[index] + Math.max(column, 1) - 1, lineEnd)
}
