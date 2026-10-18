import { StringStream } from '@codemirror/language'
import { describe, expect, it } from 'vitest'
import { barbershop } from '../data/templates/barbershop'
import { dslStreamParser } from './language'

/** Разбивает текст на куски с их стилем, пропуская кусочки без стиля и пробелы: [[текст, стиль], …] по строкам. */
function tokens(text: string): [string, string][][] {
  const state = dslStreamParser.startState!(2)
  return text.split('\n').map((line) => {
    const stream = new StringStream(line, 2, 2)
    const result: [string, string][] = []
    if (line === '') {
      dslStreamParser.blankLine?.(state, 2)
      return result
    }
    while (!stream.eol()) {
      const style = dslStreamParser.token(stream, state)
      const part = stream.current()
      if (stream.pos === stream.start) throw new Error(`Разборщик не сдвинулся в строке «${line}»`)
      if (style && part.trim()) result.push([part.trim(), style])
      stream.start = stream.pos
    }
    return result
  })
}

describe('подсветка DSL', () => {
  it('frontmatter: разделители, ключи, двоеточие, значения', () => {
    expect(tokens('---\nname: Борода\nprice: 1500\naccent: "#c0392b"\n---')).toEqual([
      [['---', 'meta']],
      [['name', 'propertyName'], [':', 'punctuation']],
      [['price', 'propertyName'], [':', 'punctuation'], ['1500', 'number']],
      [['accent', 'propertyName'], [':', 'punctuation'], ['"#c0392b"', 'string']],
      [['---', 'meta']],
    ])
  })

  it('вложенные ключи во frontmatter (contacts:) и комментарий', () => {
    expect(tokens('---\ncontacts:\n  telegram: borodа\n# заметка\n---')).toEqual([
      [['---', 'meta']],
      [['contacts', 'propertyName'], [':', 'punctuation']],
      [['telegram', 'propertyName'], [':', 'punctuation']],
      [['# заметка', 'comment']],
      [['---', 'meta']],
    ])
  })

  it('блок: ::: и имя, поля внутри, закрывающее :::', () => {
    expect(tokens(':::services\ntitle: Стрижка\nprice: 1500\n:::')).toEqual([
      [[':::', 'meta'], ['services', 'keyword']],
      [['title', 'propertyName'], [':', 'punctuation']],
      [['price', 'propertyName'], [':', 'punctuation'], ['1500', 'number']],
      [[':::', 'meta']],
    ])
  })

  it('заголовок ## вне блока; «ключ:» вне блока — обычный текст', () => {
    expect(tokens('## О нас\nNote: обычный текст')).toEqual([[['## О нас', 'heading']], []])
  })

  it('дни в :::hours (не латиница) — обычный текст', () => {
    expect(tokens(':::hours\nпн–пт: 10:00–21:00\n:::')).toEqual([
      [[':::', 'meta'], ['hours', 'keyword']],
      [],
      [[':::', 'meta']],
    ])
  })

  it('внутри :::code поля не подсвечиваются', () => {
    expect(tokens(':::code js\nconst a: number = 1\n:::')).toEqual([
      [[':::', 'meta'], ['code', 'keyword']],
      [['const a: number = 1', 'monospace']],
      [[':::', 'meta']],
    ])
  })

  it('«--- » с пробелом — не frontmatter, как и в парсере', () => {
    expect(tokens('--- \nname: Борода')).toEqual([[], []])
  })

  it('пустая первая строка — шапки нет, как и в парсере', () => {
    expect(tokens('\n---\nname: Борода\n---')).toEqual([[], [], [], []])
  })

  it('без frontmatter первая строка — сразу тело', () => {
    expect(tokens('## Привет\n---')).toEqual([[['## Привет', 'heading']], []])
  })

  it('незакрытый блок держит подсветку полей до конца, как и парсер', () => {
    expect(tokens(':::reviews\nauthor: Иван\n## Не заголовок')).toEqual([
      [[':::', 'meta'], ['reviews', 'keyword']],
      [['author', 'propertyName'], [':', 'punctuation']],
      [],
    ])
  })

  it('весь шаблон барбершопа разбирается, не зацикливаясь', () => {
    const lines = tokens(barbershop)
    expect(lines.flat().filter(([, style]) => style === 'keyword').map(([text]) => text)).toEqual([
      'services',
      'hours',
      'reviews',
      'accordion',
      'map',
      'contacts',
    ])
  })
})
