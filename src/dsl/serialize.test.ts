import { describe, expect, it } from 'vitest'
import { defaultTemplate } from '../data/defaultTemplate.ts'
import type { CardData, CardSection } from '../types/card.ts'
import { toCardData } from './cardData.ts'
import { parseDocument } from './parser.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { FRONTMATTER_EXAMPLE } from './schema/frontmatter.ts'
import { serialize } from './serialize.ts'
import { validate } from './validate.ts'

function parse(text: string): CardData {
  const result = toCardData(parseDocument(text))
  expect(result.error).toBeNull()
  return result.data!
}

/** То, что видно на сайте: у блоков — данные блока, текст секции показывается только у text. */
function visible(card: CardData) {
  return {
    ...card,
    sections: card.sections.map((section: CardSection) =>
      section.type === 'text' ? section : { ...section, content: undefined },
    ),
  }
}

/** Круговой путь: CardData → текст → CardData. */
function roundTrip(card: CardData): string {
  const text = serialize(card)
  expect(visible(parse(text))).toEqual(visible(card))
  // Повторная сериализация даёт тот же текст
  expect(serialize(parse(text))).toBe(text)
  return text
}

const businessExample = `${FRONTMATTER_EXAMPLE}
${BLOCK_NAMES.map((name) => `## ${BLOCKS[name].label}\n${BLOCKS[name].example}`).join('\n\n')}

## Цены
| Услуга | Цена |
|---|---|
| Стрижка | 1500 |
`

describe('serialize: круговой путь', () => {
  it('шаблон по умолчанию', () => {
    const text = roundTrip(parse(defaultTemplate))
    expect(validate(text)).toEqual([])
  })

  it('сайт бизнеса со всеми блоками и контактами', () => {
    const text = roundTrip(parse(businessExample))
    expect(validate(text)).toEqual([])
    expect(text).toContain('contacts:\n  telegram: barber_ivan\n  whatsapp: +7 999 123-45-67\n  primary: telegram')
  })

  it('значения, которым нужны кавычки в YAML', () => {
    const card: CardData = {
      name: '42',
      title: 'Стрижки: мужские и детские',
      theme: 'noir',
      accent: '#c0392b',
      links: [{ label: 'Почта', url: 'mailto:a@b.ru', icon: 'mail' }],
      sections: [],
      phone: '+79991234567',
      contacts: { telegram: 'barber_ivan', primary: 'telegram' },
    }
    const text = roundTrip(card)
    expect(text).toContain('title: "Стрижки: мужские и детские"')
    expect(text).toContain('accent: "#c0392b"')
  })

  it('значения по умолчанию не пишутся', () => {
    const text = serialize({ name: 'Анна', title: '', theme: 'auto', accent: 'auto', links: [], sections: [] })
    expect(text).toBe('---\nname: Анна\n---\n')
  })
})

describe('serialize: данные из нейросети (без content у блоков)', () => {
  const card: CardData = {
    name: 'Борода',
    title: '',
    theme: 'auto',
    accent: 'auto',
    links: [],
    phone: '+7 999 123-45-67',
    sections: [
      { title: '', type: 'text', content: 'Мужские стрижки в центре Самары' },
      { title: 'Цены', type: 'table', content: '', table: { headers: ['Услуга', 'Цена'], rows: [['Стрижка', '1500']] } },
      {
        title: 'Работы',
        type: 'card-grid',
        content: '',
        cards: [{ title: 'Фейд', description: 'Плавный переход\nот кожи', icon: 'star', tags: ['мужская', 'модная'] }],
      },
      { title: 'FAQ', type: 'accordion', content: '', accordion: [{ title: 'Запись?', content: 'Лучше за день' }] },
      { title: 'Пример', type: 'code-block', content: '', code: { lang: 'js', code: "console.log('hi')" } },
    ],
  }

  it('строит разметку блоков из данных', () => {
    const text = serialize(card)
    expect(text).toContain('Мужские стрижки в центре Самары\n\n## Цены\n| Услуга | Цена |\n| --- | --- |\n| Стрижка | 1500 |')
    expect(text).toContain(':::cards\ntitle: Фейд\ndescription: Плавный переход от кожи\nicon: star\ntags: мужская, модная\n:::')
    expect(text).toContain(':::code lang="js"\n')
    expect(validate(text)).toEqual([])
  })

  it('после разбора — те же данные (многострочное описание склеено)', () => {
    const parsed = parse(serialize(card))
    expect(parsed.sections.map((s) => s.type)).toEqual(['text', 'table', 'card-grid', 'accordion', 'code-block'])
    expect(parsed.sections[2].cards![0].description).toBe('Плавный переход от кожи')
    expect(parsed.sections[1].table).toEqual(card.sections[1].table)
  })

  it('секция без названия не первой — становится частью предыдущей', () => {
    const text = serialize({ ...card, sections: [card.sections[0], { title: '', type: 'text', content: 'Ещё' }] })
    expect(parse(text).sections).toHaveLength(1)
    expect(parse(text).sections[0].content).toBe('Мужские стрижки в центре Самары\n\n***\nЕщё')
  })
})

describe('serialize: случайные документы', () => {
  // Документы из случайных строк: заголовки, блоки, таблицы, незакрытые :::, «Note: …»
  const pieces = [
    '## О себе', '##', '## Цены', 'Текст', '', ':::cards', ':::accordion', ':::code lang="js"', ':::faq', ':::',
    'title: A', 'content: ответ', 'description: d', 'Note: n', 'url: https://a.ru', 'link: https://l.ru', 'icon: star',
    'tags: a, b; c', ':::contacts', ':::services', 'price: 1500р', 'duration: 60 мин', ':::hours', 'пн-пт 10-20', 'сб, вс: выходной', 'завтра: 10-20', ':::reviews', 'author: Иван', 'text: Отлично', 'rating: 5/5', 'rating: 4', ':::map', 'address: ул. Ленина, 10', '| a | b |', '|---|---|', '| 1 | 2 |', 'a | b', '    отступ', 'Важно: да', '***',
  ]
  const heads = [
    '---\nname: Тест\n---\n',
    '---\nname: Борода\ntitle: "Стрижки: мужские"\naccent: abc\nphone: 89991234567\ncontacts:\n  tg: x\n  telegram: barber_ivan\n---\n',
  ]

  it('2000 документов проходят круговой путь', () => {
    let seed = 11
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return (seed >>> 16) % n
    }
    for (let i = 0; i < 2000; i++) {
      const lines = Array.from({ length: 1 + random(12) }, () => pieces[random(pieces.length)])
      const card = parse(heads[random(heads.length)] + lines.join('\n'))
      const text = serialize(card)
      expect(visible(parse(text)), text).toEqual(visible(card))
    }
  })
})
