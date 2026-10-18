import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { ThemeName } from '../../types/card.ts'
import { parseDocument } from '../parser.ts'
import { BLOCK_NAMES, BLOCKS } from './blocks.ts'
import { contactsSchema, FRONTMATTER_EXAMPLE, frontmatterSchema, THEME_NAMES } from './frontmatter.ts'
import { ICON_NAMES, iconSchema } from './icons.ts'

/** Описание поля из .meta(), с учётом обёртки .optional(). */
function descriptionOf(schema: z.ZodType): string | undefined {
  const inner = schema instanceof z.ZodOptional ? (schema.unwrap() as z.ZodType) : schema
  return inner.description
}

/** Все поля объектов схемы (включая вложенные contacts и links[]) — путь и схема поля. */
function allFields(shape: Record<string, z.ZodType>, prefix = ''): [string, z.ZodType][] {
  return Object.entries(shape).flatMap(([key, field]): [string, z.ZodType][] => {
    const inner = field instanceof z.ZodOptional ? (field.unwrap() as z.ZodType) : field
    const path = prefix + key
    if (inner instanceof z.ZodObject) return [[path, field], ...allFields(inner.shape, `${path}.`)]
    if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject) {
      return [[path, field], ...allFields(inner.element.shape, `${path}[].`)]
    }
    return [[path, field]]
  })
}

describe('схема: шапка', () => {
  it('у каждого поля есть описание по-русски', () => {
    for (const [path, field] of allFields(frontmatterSchema.shape)) {
      expect(descriptionOf(field), path).toMatch(/[а-яё]/i)
    }
  })

  it('пример шапки проходит схему', () => {
    const data = parseDocument(`${FRONTMATTER_EXAMPLE}\n`).frontmatter!.data
    expect(frontmatterSchema.safeParse(data).error).toBeUndefined()
  })

  it('name обязателен, остальные поля — нет', () => {
    expect(frontmatterSchema.safeParse({ name: 'Анна' }).success).toBe(true)
    expect(frontmatterSchema.safeParse({}).success).toBe(false)
  })

  it.each([
    ['неизвестное поле', { name: 'А', phon: '+7' }],
    ['неизвестная тема', { name: 'А', theme: 'neon' }],
    ['цвет не #hex', { name: 'А', accent: 'red' }],
    ['неизвестный бизнес', { name: 'А', business: 'cafe' }],
    ['primary на неизвестный контакт', { name: 'А', contacts: { primary: 'telegramm' } }],
  ])('отклоняет: %s', (_, value) => {
    expect(frontmatterSchema.safeParse(value).success).toBe(false)
  })

  it('primary может указывать на телефон', () => {
    expect(contactsSchema.safeParse({ primary: 'phone' }).success).toBe(true)
  })

  it('список тем совпадает с типом ThemeName', () => {
    const all: Record<ThemeName, true> = { glass: true, minimal: true, noir: true, vercel: true }
    expect([...THEME_NAMES].sort()).toEqual(Object.keys(all).sort())
  })
})

describe('схема: блоки', () => {
  it('список блоков', () => {
    expect(BLOCK_NAMES).toEqual(['cards', 'accordion', 'code', 'services', 'hours', 'contacts'])
  })

  it.each(BLOCK_NAMES)('%s: у блока и каждого поля есть описание', (name) => {
    const block = BLOCKS[name]
    expect(block.label).toMatch(/[а-яё]/i)
    expect(block.description).toMatch(/[а-яё]/i)
    const fields = [...allFields(block.attrs.shape), ...(block.item ? allFields(block.item.shape) : [])]
    for (const [path, field] of fields) expect(descriptionOf(field), `${name}.${path}`).toMatch(/[а-яё]/i)
  })

  it.each(BLOCK_NAMES)('%s: пример разбирается в этот блок, элементы проходят схему', (name) => {
    const block = BLOCKS[name]
    const blocks = parseDocument(block.example).sections.flatMap((section) => section.blocks)
    expect(blocks.map((b) => [b.name, b.closeRange !== null])).toEqual([[name, true]])

    if (!block.item) return
    expect(blocks[0].items.length).toBeGreaterThan(0)
    for (const item of blocks[0].items) {
      const value = Object.fromEntries(item.fields.map((field) => [field.key, field.value]))
      expect(block.item.safeParse(value).error).toBeUndefined()
    }
  })

  it('code: атрибут lang', () => {
    expect(BLOCKS.code.attrs.safeParse({ lang: 'js' }).success).toBe(true)
    expect(BLOCKS.code.attrs.safeParse({ langg: 'js' }).success).toBe(false)
  })
})

describe('схема: иконки', () => {
  it('принимает только известные иконки', () => {
    expect(ICON_NAMES).toContain('star')
    expect(iconSchema.safeParse('star').success).toBe(true)
    expect(iconSchema.safeParse('scissors').success).toBe(false)
  })
})

describe('JSON Schema (для режима «JSON по схеме» в этапе 5)', () => {
  it('строится для шапки, с описаниями и запретом лишних полей', () => {
    const json = z.toJSONSchema(frontmatterSchema) as {
      required: string[]
      additionalProperties: boolean
      properties: Record<string, { description?: string }>
    }
    expect(json.required).toEqual(['name'])
    expect(json.additionalProperties).toBe(false)
    expect(json.properties.phone.description).toBe('Телефон для звонков')
  })

  it.each(BLOCK_NAMES)('строится для блока %s', (name) => {
    const block = BLOCKS[name]
    expect(() => z.toJSONSchema(block.attrs)).not.toThrow()
    if (block.item) expect(z.toJSONSchema(block.item)).toHaveProperty('properties.title.description')
  })
})
