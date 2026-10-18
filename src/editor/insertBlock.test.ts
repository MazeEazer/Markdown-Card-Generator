import { describe, expect, it } from 'vitest'
import { parseDocument } from '../dsl/parser'
import { BLOCK_NAMES } from '../dsl/schema/blocks'
import {
  blockForm,
  blockMarkup,
  blockProblems,
  type BlockValues,
  emptyValues,
  insertBlock,
  insertionPoint,
  missingRequired,
} from './insertBlock'

const values = (patch: Partial<BlockValues>): BlockValues => ({ heading: '', attrs: {}, items: [], body: '', ...patch })

/** Позиция курсора `|` → куда встанет блок (показываем строку, после которой). */
function pointAfter(textWithCursor: string) {
  const pos = textWithCursor.indexOf('|')
  const text = textWithCursor.replace('|', '')
  const at = insertionPoint(text, pos)
  return text.slice(text.lastIndexOf('\n', at - 1) + 1, at)
}

describe('форма блока по схеме', () => {
  it('services: поля услуги с подписями и примерами, обязательное — title', () => {
    const form = blockForm('services')
    expect(form.itemLabel).toBe('Услуга')
    expect(form.item?.map((f) => [f.key, f.required])).toEqual([
      ['title', true],
      ['price', false],
      ['duration', false],
      ['description', false],
    ])
    expect(form.item?.[0]).toMatchObject({ label: 'Название услуги', placeholder: 'Мужская стрижка' })
    expect(form.item?.find((f) => f.key === 'description')?.multiline).toBe(true)
  })

  it('cards: icon — выпадающий список, устаревшего link нет', () => {
    const fields = blockForm('cards').item!
    expect(fields.find((f) => f.key === 'icon')?.options).toContain('star')
    expect(fields.map((f) => f.key)).not.toContain('link')
  })

  it('hours и code — многострочное содержимое; code — ещё атрибут lang', () => {
    expect(blockForm('hours').body?.placeholder).toMatch(/^пн–пт: 10:00–20:00/)
    expect(blockForm('code').attrs.map((f) => f.key)).toEqual(['lang'])
  })

  it('map и contacts — пояснение, что писать внутри ничего не нужно', () => {
    expect(blockForm('contacts').note).toMatch(/ничего писать не нужно/)
    expect(blockForm('map').note).toMatch(/ничего писать не нужно/)
  })
})

describe('разметка блока', () => {
  it('заголовок раздела, элементы через пустую строку, пустые поля пропущены', () => {
    const markup = blockMarkup(
      blockForm('services'),
      values({
        heading: 'Цены',
        items: [{ title: 'Стрижка', price: '1500', duration: '' }, { title: '', price: '' }, { title: 'Борода', price: '800' }],
      }),
    )
    expect(markup).toBe('## Цены\n:::services\ntitle: Стрижка\nprice: 1500\n\ntitle: Борода\nprice: 800\n:::')
  })

  it('перевод строки в значении склеивается в одну строку, как в serialize', () => {
    const markup = blockMarkup(blockForm('reviews'), values({ items: [{ author: 'Ольга', text: 'Всё\nотлично' }] }))
    expect(markup).toBe(':::reviews\nauthor: Ольга\ntext: Всё отлично\n:::')
  })

  it('код: атрибут lang и строки как есть', () => {
    const markup = blockMarkup(blockForm('code'), values({ attrs: { lang: 'js' }, body: '\nif (a) {\n  b()\n}\n' }))
    expect(markup).toBe(':::code lang="js"\nif (a) {\n  b()\n}\n:::')
  })

  it('каждый блок с примерами из схемы разбирается парсером обратно', () => {
    for (const name of BLOCK_NAMES) {
      const form = blockForm(name)
      const example = Object.fromEntries((form.item ?? []).map((f) => [f.key, f.options ? f.options[0] : f.placeholder]))
      const markup = blockMarkup(form, values({ heading: 'Раздел', items: [example], body: form.body?.placeholder ?? '' }))
      const blocks = parseDocument(`---\nname: Тест\n---\n\n${markup}\n`).sections.flatMap((s) => s.blocks)
      expect(blocks.map((b) => b.name), name).toEqual([name])
    }
  })
})

describe('что мешает вставить', () => {
  it('пустая форма услуг и пропущенное обязательное поле', () => {
    const form = blockForm('services')
    expect(missingRequired(form, emptyValues(form))).toEqual(['Заполните хотя бы один элемент «Услуга»'])
    expect(missingRequired(form, values({ items: [{ price: '1500' }] }))).toEqual(['Услуга 1: заполните «Название услуги»'])
    expect(missingRequired(form, values({ items: [{ title: 'Стрижка' }] }))).toEqual([])
  })

  it('карту и контакты можно вставить пустыми, часы — нет', () => {
    expect(missingRequired(blockForm('map'), emptyValues(blockForm('map')))).toEqual([])
    expect(missingRequired(blockForm('contacts'), emptyValues(blockForm('contacts')))).toEqual([])
    expect(missingRequired(blockForm('hours'), emptyValues(blockForm('hours')))).toEqual(['Заполните содержимое блока'])
  })
})

describe('место вставки', () => {
  it('после строки с курсором', () => {
    expect(pointAfter('## О нас\nТекст| раздела\nЕщё')).toBe('Текст раздела')
  })

  it('курсор в шапке — после закрывающего ---', () => {
    expect(pointAfter('---\nname: Бо|рода\nphone: 1\n---\n\n## О нас')).toBe('---')
  })

  it('курсор внутри блока или на его открытии — после закрывающего :::', () => {
    expect(pointAfter('## Цены\n:::services\ntitle: Стр|ижка\nprice: 1\n:::\nтекст')).toBe(':::')
    expect(pointAfter(':::servi|ces\ntitle: А\n:::')).toBe(':::')
  })

  it('незакрытый блок — в конец документа', () => {
    expect(insertionPoint(':::services\ntitle: А', 3)).toBe(':::services\ntitle: А'.length)
  })
})

describe('вставка', () => {
  const markup = '## Цены\n:::services\ntitle: А\n:::'

  it('пустые строки вокруг блока', () => {
    const text = '## О нас\nТекст\n## Контакты'
    const { from, insert } = insertBlock(text, 10, markup)
    expect(text.slice(0, from) + insert + text.slice(from)).toBe(`## О нас\nТекст\n\n${markup}\n\n## Контакты`)
  })

  it('уже есть пустая строка после — лишнюю не добавляем', () => {
    const text = 'Текст\n\nДальше'
    const { from, insert } = insertBlock(text, 2, markup)
    expect(text.slice(0, from) + insert + text.slice(from)).toBe(`Текст\n\n${markup}\n\nДальше`)
  })

  it('в конец документа и в пустой документ', () => {
    const { from, insert } = insertBlock('Текст', 5, markup)
    expect('Текст'.slice(0, from) + insert).toBe(`Текст\n\n${markup}\n`)
    expect(insertBlock('', 0, markup)).toEqual({ from: 0, insert: `${markup}\n`, blockStart: 0 })
  })

  it('blockStart — начало заголовка блока', () => {
    const text = '## О нас\nТекст'
    const { from, insert, blockStart } = insertBlock(text, 3, markup)
    expect((text.slice(0, from) + insert).slice(blockStart, blockStart + 7)).toBe('## Цены')
  })
})

describe('проверка вставляемого блока валидатором', () => {
  const doc = '---\nname: Борода\nphone: +7 999 123-45-67\n---\n\n## О нас\nТекст\n'

  it('замечания только к самому блоку', () => {
    const problems = blockProblems(doc, doc.length, '## Цены\n:::services\ntitle: Стрижка\nprice: дорого\n:::')
    expect(problems.map((d) => d.code).sort()).toEqual(['price-not-number', 'service-no-description'])
  })

  it('хороший блок — без замечаний', () => {
    expect(blockProblems(doc, doc.length, '## Часы\n:::hours\nежедневно: 10:00–20:00\n:::')).toEqual([])
  })

  it('карта видит адрес из шапки документа', () => {
    expect(blockProblems(doc, doc.length, ':::map\n:::').length).toBeGreaterThan(0)
    const withAddress = doc.replace('---\n\n', 'address: ул. Ленина, 1\ncity: Самара\n---\n\n')
    expect(blockProblems(withAddress, withAddress.length, ':::map\n:::')).toEqual([])
  })
})
