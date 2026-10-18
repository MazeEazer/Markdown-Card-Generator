import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('heading-no-space', () => {
  it('##Цены — исправление добавляет пробел', () => {
    const text = doc('', '## О себе\nТекст\n##Цены\n1500')
    const d = findOne(text, 'heading-no-space')
    expect(underlined(text, d)).toBe('##Цены')
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.sections.map((s) => s.title)).toEqual(['О себе', 'Цены'])
  })

  it('### и строки внутри блоков не трогаем', () => {
    expect(findAll(doc('', '### Подзаголовок\n:::code\n##x\n:::'), 'heading-no-space')).toEqual([])
  })
})

describe('crlf-heading', () => {
  it('заголовок с переводами строк Windows — исправление во всём тексте', () => {
    const text = '---\r\nname: Анна\r\n---\r\n## О себе\r\nТекст\r\n## Цены\r\n1500'
    const found = findAll(text, 'crlf-heading')
    expect(found.map((d) => underlined(text, d))).toEqual(['## О себе', '## Цены'])

    const fixed = fixAndRecheck(text, found[0])
    expect(fixed).not.toContain('\r')
    expect(parseCardMarkdown(fixed).data!.sections.map((s) => s.title)).toEqual(['О себе', 'Цены'])
  })

  it('## без названия с CRLF работает и так', () => {
    expect(findAll('---\r\nname: A\r\n---\r\nТекст\r\n##\r\nЕщё', 'crlf-heading')).toEqual([])
  })
})
