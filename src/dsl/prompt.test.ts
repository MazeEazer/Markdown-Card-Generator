import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CardData } from '../types/card.ts'
import { toCardData } from './cardData.ts'
import { fromJson } from './fromJson.ts'
import { parseDocument } from './parser.ts'
import { buildSystemPrompt, EXAMPLE_DOCUMENT, EXAMPLE_JSON, getJsonSchema } from './prompt.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { documentSchema } from './schema/document.ts'
import { BUSINESS_NAMES, CONTACT_NAMES, frontmatterSchema, THEME_NAMES } from './schema/frontmatter.ts'
import { ICON_NAMES } from './schema/icons.ts'
import { serialize } from './serialize.ts'
import { validate } from './validate.ts'

const markdown = buildSystemPrompt({ mode: 'markdown' })
const json = buildSystemPrompt({ mode: 'json' })

/** Что видно на сайте: у блоков текст секции не показывается. */
function visible(card: CardData) {
  return { ...card, sections: card.sections.map((s) => (s.type === 'text' ? s : { ...s, content: '' })) }
}

describe('buildSystemPrompt: всё из схемы попадает в промпт', () => {
  const fields = Object.keys(frontmatterSchema.shape).filter((key) => key !== 'location')

  it.each([
    ['поля шапки', fields],
    ['контакты', [...CONTACT_NAMES, 'primary']],
    ['темы', THEME_NAMES],
    ['виды бизнеса', BUSINESS_NAMES],
    ['иконки', ICON_NAMES],
  ])('%s', (_, names) => {
    for (const prompt of [markdown, json]) {
      for (const name of names) expect(prompt, name).toContain(name)
    }
  })

  it.each(BLOCK_NAMES)('блок %s: имя, описание и поля', (name) => {
    const block = BLOCKS[name]
    expect(markdown).toContain(`:::${name} — ${block.label}`)
    expect(markdown).toContain(block.example)
    for (const field of Object.keys(block.item?.shape ?? {}).filter((key) => key !== 'link')) {
      expect(markdown).toContain(`- ${field}`)
    }
  })

  it('устаревшие поля не предлагаются', () => {
    expect(markdown).not.toMatch(/^- location/m)
    expect(markdown).not.toMatch(/^ {2}- link /m)
  })

  it('правило «не выдумывать» и формат ответа', () => {
    for (const prompt of [markdown, json]) expect(prompt).toMatch(/Не придумывай телефон/)
    expect(markdown).toMatch(/только документ на языке MD Card/)
    expect(json).toMatch(/только JSON-объект/)
  })

  it('вид бизнеса из интерфейса', () => {
    expect(buildSystemPrompt({ mode: 'markdown', business: 'nails' })).toContain('Вид бизнеса: мастер маникюра (business: nails)')
  })

  it('без служебного мусора', () => {
    for (const prompt of [markdown, json]) expect(prompt).not.toMatch(/undefined|\[object Object\]/)
  })

  it('снимок промпта (markdown)', () => {
    // Полный текст — в __snapshots__/prompt.test.ts.snap; при изменении схемы снимок обновляется: npx vitest -u
    expect(markdown).toMatchSnapshot()
  })
})

describe('примеры в промпте', () => {
  it('пример документа проходит валидатор без замечаний', () => {
    expect(validate(EXAMPLE_DOCUMENT)).toEqual([])
  })

  it('пример JSON проходит схему документа', () => {
    expect(documentSchema.safeParse(EXAMPLE_JSON).error).toBeUndefined()
  })

  it('пример JSON и пример документа — один и тот же сайт', () => {
    const fromDocument = toCardData(parseDocument(EXAMPLE_DOCUMENT)).data!
    expect(visible(fromJson(EXAMPLE_JSON))).toEqual(visible(fromDocument))
  })

  it('JSON → CardData → разметка проходит валидатор', () => {
    expect(validate(serialize(fromJson(EXAMPLE_JSON)))).toEqual([])
  })
})

describe('getJsonSchema', () => {
  const schema = getJsonSchema() as {
    required: string[]
    additionalProperties: boolean
    properties: Record<string, unknown>
  }

  it('name и sections обязательны, лишние поля запрещены', () => {
    expect(schema.required.sort()).toEqual(['name', 'sections'])
    expect(schema.additionalProperties).toBe(false)
  })

  it('пять видов разделов', () => {
    const sections = schema.properties.sections as { items: { oneOf: { properties: { type: { const: string } } }[] } }
    expect(sections.items.oneOf.map((s) => s.properties.type.const)).toEqual(['text', 'table', 'cards', 'accordion', 'code'])
  })

  it('без устаревшего location', () => {
    expect(schema.properties).not.toHaveProperty('location')
  })

  it('JSON с выдуманным полем не проходит', () => {
    expect(documentSchema.safeParse({ ...EXAMPLE_JSON, rating: 5 }).success).toBe(false)
    expect(z.toJSONSchema(documentSchema)).toEqual(schema)
  })
})

describe('fromJson', () => {
  it('теги строкой → список, цвет → #rrggbb, пустой текстовый раздел отбрасывается', () => {
    const card = fromJson({
      name: ' Анна ',
      accent: '#abc',
      sections: [
        { type: 'text', title: 'Пусто', content: '  ' },
        { type: 'cards', title: 'Работы', items: [{ title: 'Маникюр', tags: 'гель; дизайн' }] },
        { type: 'table', title: 'Цены', headers: ['Услуга', 'Цена'], rows: [['Маникюр']] },
      ],
    })
    expect(card.name).toBe('Анна')
    expect(card.accent).toBe('#aabbcc')
    expect(card.sections.map((s) => s.title)).toEqual(['Работы', 'Цены'])
    expect(card.sections[0].cards![0].tags).toEqual(['гель', 'дизайн'])
    expect(card.sections[1].table!.rows).toEqual([['Маникюр', '']])
  })
})
