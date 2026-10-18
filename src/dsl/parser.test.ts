import { describe, expect, it } from 'vitest'
import { parseDocument } from './parser.ts'
import type { Range } from './types.ts'

/** Текст по диапазону — так тесты читаются нагляднее, чем голые числа. */
function at(text: string, range: Range | null | undefined): string | null {
  return range ? text.slice(range.from, range.to) : null
}

describe('parseDocument: шапка', () => {
  const text = '---\nname: Барбершоп\naccent: #abc\nphone: +7 999 123-45-67\n---\n## Услуги\nТекст'
  const { frontmatter, bodyFrom } = parseDocument(text)

  it('находит шапку и начало тела', () => {
    expect(frontmatter).not.toBeNull()
    expect(at(text, frontmatter)).toBe('---\nname: Барбершоп\naccent: #abc\nphone: +7 999 123-45-67\n---')
    expect(text.slice(bodyFrom)).toBe('## Услуги\nТекст')
  })

  it('у полей есть позиции ключа и значения', () => {
    const fields = frontmatter!.fields.map((field) => [field.key, at(text, field.keyRange), at(text, field.valueRange)])
    expect(fields).toEqual([
      ['name', 'name', 'Барбершоп'],
      ['accent', 'accent', null], // #abc без кавычек — YAML-комментарий, значения нет
      ['phone', 'phone', '+7 999 123-45-67'],
    ])
  })

  it('без шапки — frontmatter null, тело с начала', () => {
    const ast = parseDocument('## О себе\nТекст')
    expect(ast.frontmatter).toBeNull()
    expect(ast.bodyFrom).toBe(0)
  })

  it('ошибка YAML — с позицией в исходном тексте, данные пустые', () => {
    const broken = '---\nname: [Тест\n---\n'
    const fm = parseDocument(broken).frontmatter!
    expect(fm.data).toEqual({})
    expect(fm.errors).toHaveLength(1)
    expect(fm.errors[0].code).toBe('BAD_INDENT')
    expect(fm.errors[0].from).toBeGreaterThanOrEqual(fm.yamlFrom)
  })

  it('позиции верны и при переводах строк CRLF', () => {
    const crlf = '---\r\nname: Анна\r\n---\r\nТекст'
    const ast = parseDocument(crlf)
    expect(at(crlf, ast.frontmatter!.fields[0].valueRange)).toBe('Анна')
    expect(crlf.slice(ast.bodyFrom)).toBe('Текст')
  })
})

describe('parseDocument: секции', () => {
  const text = '---\nname: A\n---\nВступление\n## О себе\nСтригу\n##\nбороды\n## Пусто\n'
  const { sections } = parseDocument(text)

  it('секции с заголовками и позициями', () => {
    expect(sections.map((s) => [s.title, at(text, s.headingRange), at(text, s.titleRange), s.content])).toEqual([
      ['', null, null, 'Вступление'],
      ['О себе', '## О себе', 'О себе', 'Стригу\n***\nбороды'],
      ['Пусто', '## Пусто', 'Пусто', ''],
    ])
  })

  it('диапазон секции — от заголовка до последней строки', () => {
    expect(at(text, sections[1])).toBe('## О себе\nСтригу\n##\nбороды')
  })

  it('пустые секции остаются в AST (в CardData их нет)', () => {
    expect(sections[2].content).toBe('')
  })
})

describe('parseDocument: блоки', () => {
  const text = [
    '## Работы',
    ':::cards  ',
    'title: Стрижка',
    'description: Машинкой',
    '  и ножницами',
    '',
    'без ключа',
    'TITLE: Борода',
    ':::',
    '## Код',
    ':::code lang="js"',
    'let x',
  ].join('\n')
  const { sections } = parseDocument(text)
  const cards = sections[0].blocks[0]
  const code = sections[1].blocks[0]

  it('имя, атрибуты и границы блока', () => {
    expect(cards.name).toBe('cards')
    expect(at(text, cards.nameRange)).toBe('cards')
    expect(at(text, cards.openRange)).toBe(':::cards  ')
    expect(at(text, cards.closeRange)).toBe(':::')
    expect(at(text, code.attrsRange)).toBe('lang="js"')
    expect(code.attrs).toBe('lang="js"')
  })

  it('элементы делятся пустой строкой, поля с позициями', () => {
    expect(cards.items).toHaveLength(2)
    const [first, second] = cards.items
    expect(first.fields.map((f) => [f.key, f.value, at(text, f.keyRange), at(text, f.valueRange)])).toEqual([
      ['title', 'Стрижка', 'title', 'Стрижка'],
      ['description', 'Машинкой и ножницами', 'description', 'Машинкой\n  и ножницами'],
    ])
    expect(second.stray.map((r) => at(text, r))).toEqual(['без ключа'])
    expect(second.fields.map((f) => [f.key, at(text, f.keyRange)])).toEqual([['title', 'TITLE']])
  })

  it('незакрытый блок тянется до конца документа', () => {
    expect(code.closeRange).toBeNull()
    expect(code.to).toBe(text.length)
    expect(at(text, code.bodyRange)).toBe('let x')
  })

  it('незакрытый блок поглощает следующие заголовки', () => {
    const swallow = '## FAQ\n:::accordion\ntitle: В\n## Контакты\nТелефон'
    const ast = parseDocument(swallow)
    expect(ast.sections).toHaveLength(1)
    expect(ast.sections[0].blocks[0].closeRange).toBeNull()
  })

  it('поле с пустым значением и продолжением на следующей строке', () => {
    const t = ':::accordion\ncontent:\nОтвет\n:::'
    const field = parseDocument(t).sections[0].blocks[0].items[0].fields[0]
    expect(field.value).toBe('Ответ')
    expect(at(t, field.valueRange)).toBe('Ответ')
  })
})
