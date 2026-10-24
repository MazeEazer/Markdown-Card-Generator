import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { dataUrlFolding, dataUrlRanges, formatBytes } from './dataUrl'

const BASE64 = 'A'.repeat(26 * 1024 * 4 / 3)
const PHOTO = `data:image/jpeg;base64,${BASE64}`

describe('dataUrlRanges: фото в тексте', () => {
  it('находит data-URL изображения и считает размер', () => {
    const text = `---\nname: A\navatar: ${PHOTO}\n---\n`
    const [range] = dataUrlRanges(text)
    expect(text.slice(range.from, range.to)).toBe(PHOTO)
    expect(range.format).toBe('jpeg')
    expect(formatBytes(range.bytes)).toBe('26 КБ')
  })

  it('короткие data-URL и обычные ссылки не сворачиваются', () => {
    expect(dataUrlRanges('avatar: data:image/png;base64,iVBORw0KGgo=')).toEqual([])
    expect(dataUrlRanges('avatar: https://example.ru/photo.jpg')).toEqual([])
  })

  it('размер: байты, килобайты, мегабайты', () => {
    expect(formatBytes(800)).toBe('800 Б')
    expect(formatBytes(26_000)).toBe('25 КБ')
    expect(formatBytes(1_300_000)).toBe('1,2 МБ')
  })
})

describe('dataUrlFolding: текст документа не меняется', () => {
  it('плашка — только отображение: в документе остаётся полная строка', () => {
    const doc = `---\nname: A\navatar: ${PHOTO}\n---\n`
    const state = EditorState.create({ doc, extensions: [dataUrlFolding()], selection: EditorSelection.cursor(0) })
    const next = state.update({ changes: { from: 0, insert: 'x' } }).state
    expect(next.doc.toString()).toBe(`x${doc}`)
  })
})
