import { describe, expect, it } from 'vitest'
import { lineColToOffset, lineStarts, offsetToLineCol } from './position.ts'

const text = '---\nname: Иван\n---\n## Услуги'

describe('lineStarts', () => {
  it('возвращает начало каждой строки', () => {
    expect(lineStarts(text)).toEqual([0, 4, 15, 19])
  })

  it('у пустого текста одна строка', () => {
    expect(lineStarts('')).toEqual([0])
  })
})

describe('offsetToLineCol', () => {
  it.each([
    [0, 1, 1],
    [4, 2, 1],
    [10, 2, 7], // «И» в «Иван»
    [19, 4, 1],
    [text.length, 4, 10],
  ])('смещение %i → строка %i, колонка %i', (offset, line, column) => {
    expect(offsetToLineCol(text, offset)).toEqual({ line, column })
  })

  it('прижимает смещение к границам текста', () => {
    expect(offsetToLineCol(text, -5)).toEqual({ line: 1, column: 1 })
    expect(offsetToLineCol(text, 999)).toEqual({ line: 4, column: 10 })
  })

  it('при CRLF колонки считаются с учётом \\r в конце строки', () => {
    expect(offsetToLineCol('a\r\nb', 3)).toEqual({ line: 2, column: 1 })
  })
})

describe('lineColToOffset', () => {
  it('обратна offsetToLineCol', () => {
    for (let offset = 0; offset <= text.length; offset++) {
      expect(lineColToOffset(text, offsetToLineCol(text, offset))).toBe(offset)
    }
  })

  it('прижимает колонку к концу строки, а строку — к границам текста', () => {
    expect(lineColToOffset(text, { line: 1, column: 50 })).toBe(3)
    expect(lineColToOffset(text, { line: 99, column: 1 })).toBe(19)
  })
})
