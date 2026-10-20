import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CardData } from '../types/card.ts'
import { toCardData } from './cardData.ts'
import { fromJson } from './fromJson.ts'
import { parseDocument } from './parser.ts'
import { buildSystemPrompt, EXAMPLE_DOCUMENT, EXAMPLE_JSON, getJsonSchema, promptExample } from './prompt.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { documentSchema } from './schema/document.ts'
import { BUSINESS_NAMES, CONTACT_NAMES, frontmatterSchema, THEME_NAMES } from './schema/frontmatter.ts'
import { ICON_NAMES } from './schema/icons.ts'
import { serialize } from './serialize.ts'
import { validate } from './validate.ts'

/** Копия JSON без указанных ключей на любой глубине. */
function withoutKeys(node: unknown, keys: string[]): unknown {
  if (Array.isArray(node)) return node.map((item) => withoutKeys(item, keys))
  if (!node || typeof node !== 'object') return node
  return Object.fromEntries(Object.entries(node).filter(([key]) => !keys.includes(key)).map(([key, value]) => [key, withoutKeys(value, keys)]))
}

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
    expect(markdown).toContain(promptExample(block))
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

// Правдоподобные факты из примеров схемы (они остаются в редакторе — для человека). Нейросеть переписывала
// такие примеры в сайт как правду: «Можно ли оплатить картой? — Да», «ножницами и машинкой, мытьё головы»
const FACTS_FROM_EXAMPLES = [
  'оплатить картой', 'принимаем карты', 'СБП', 'Нужна ли запись заранее', 'Лучше записаться за день', 'без записи',
  'Машинкой и ножницами', 'мытьё головы', 'укладка', 'Моделирование', 'горячее полотенце',
  'Лучший фейд', 'мастер не торопится', 'Привожу сына', 'всегда аккуратно', 'Алексей', 'Ольга',
  'с 2015 года', 'без спешки', 'уход за бородой', 'мужская, классика', 'мужская, детская',
  // Контакты из примеров редактора: модель подставила этот номер в сайт без контактов (шаг 8, 6-no-contacts)
  '999 123-45-67', 'barber_ivan', 'barber_samara', 'barber.ivan', 'f9LHodD0',
  // Адрес и город из примеров редактора: кофейня без адреса получила «ул. Ленина, 15» (ручные тесты)
  'Ленина', 'Самара',
  // Цвет из примера стоял почти у всех сайтов (ручные тесты)
  '#c0392b',
]

describe('правила против выдуманных фактов', () => {
  it.each([['markdown', markdown], ['json', json]])('%s: в промпте нет правдоподобных фактов из примеров схемы', (_mode, prompt) => {
    for (const phrase of FACTS_FROM_EXAMPLES) expect(prompt, phrase).not.toContain(phrase)
  })

  it('в редакторе примеры остаются правдоподобными', () => {
    const phone = frontmatterSchema.shape.phone.unwrap().meta() as { examples: string[] }
    expect(phone.examples).toEqual(['+7 999 123-45-67'])
    expect(BLOCKS.accordion.example).toContain('Можно ли оплатить картой?')
    expect(BLOCKS.services.example).toContain('Машинкой и ножницами')
  })

  it('пример блока для промпта: формат тот же, свободный текст — условный и пронумерованный', () => {
    expect(promptExample(BLOCKS.services)).toBe(
      ':::services\ntitle: Название услуги 1 — из описания\nprice: 1500\nduration: 60 мин\ndescription: Что входит в услугу 1 — из описания\n\ntitle: Название услуги 2 — из описания\nprice: от 800\n:::',
    )
    expect(promptExample(BLOCKS.hours)).toBe(BLOCKS.hours.example)
  })

  it.each([['markdown', markdown], ['json', json]])('%s: phone — только номер для звонков, номер для мессенджера — только в contacts', (_mode, prompt) => {
    expect(prompt).toMatch(/phone — только если номер дан для звонков/)
    expect(prompt).toMatch(/Номер, данный только для WhatsApp или Telegram.*только в contacts \(whatsapp\), phone не заполняй/)
  })

  it.each([['markdown', markdown], ['json', json]])('%s: без служебного текста на сайте; цвет — только если назван', (_mode, prompt) => {
    expect(prompt).toMatch(/не объясняй на сайте, почему какого-то раздела нет/)
    expect(prompt).toMatch(/accent \(цвет\) пиши, только если цвет назван в описании/)
  })

  it.each([['markdown', markdown], ['json', json]])('%s: вопросы — только из описания, карта — только при адресе', (_mode, prompt) => {
    expect(prompt).toMatch(/:::accordion\) — только с вопросами и ответами, которые есть в описании/)
    expect(prompt).toMatch(/Карту \(:::map.*только если в описании есть адрес, куда приходят клиенты/)
  })

  it.each([['markdown', markdown], ['json', json]])('%s: необязательные поля — только из описания, текст — без новых фактов', (_mode, prompt) => {
    expect(prompt).toMatch(/description и duration у услуг.*пиши, только если это есть в описании/)
    expect(prompt).toMatch(/Нет в описании — не пиши поле совсем/)
    expect(prompt).toMatch(/«О нас».*только пересказ описания.*Не добавляй новых фактов: услуг, опыта, материалов/)
    expect(prompt).toMatch(/Не переноси из примеров названия и описания услуг/)
  })
})

describe('примеры в промпте', () => {
  // Единственная подсказка — у второй услуги нет описания: пример показывает, что необязательные поля
  // пишутся только при наличии данных (иначе нейросеть переписывает описания из примера)
  it('пример документа проходит валидатор: только подсказка об услуге без описания', () => {
    expect(validate(EXAMPLE_DOCUMENT).map((d) => d.code)).toEqual(['service-no-description'])
  })

  it('пример JSON проходит схему документа', () => {
    expect(documentSchema.safeParse(EXAMPLE_JSON).error).toBeUndefined()
  })

  it('пример JSON и пример документа — один и тот же сайт', () => {
    const fromDocument = toCardData(parseDocument(EXAMPLE_DOCUMENT)).data!
    expect(visible(fromJson(EXAMPLE_JSON))).toEqual(visible(fromDocument))
  })

  it('в примерах есть услуга без описания и длительности — пример не подталкивает их выдумывать', () => {
    const services = EXAMPLE_JSON.sections.flatMap((s) => (s.type === 'services' ? s.items : []))
    expect(services.some((item) => !item.description && !item.duration)).toBe(true)
    const blocks = parseDocument(EXAMPLE_DOCUMENT).sections.flatMap((s) => s.blocks).filter((b) => b.name === 'services')
    const keys = blocks.flatMap((b) => b.items.map((item) => item.fields.map((f) => f.key)))
    expect(keys.some((k) => !k.includes('description') && !k.includes('duration'))).toBe(true)
  })

  it('JSON → CardData → разметка проходит валидатор', () => {
    expect(validate(serialize(fromJson(EXAMPLE_JSON))).map((d) => d.code)).toEqual(['service-no-description'])
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

  it('виды разделов: текст, таблица и все блоки', () => {
    const sections = schema.properties.sections as { items: { oneOf: { properties: { type: { const: string } } }[] } }
    expect(sections.items.oneOf.map((s) => s.properties.type.const)).toEqual(['text', 'table', ...BLOCK_NAMES])
  })

  it('без устаревшего location', () => {
    expect(schema.properties).not.toHaveProperty('location')
  })

  it('JSON с выдуманным полем не проходит', () => {
    expect(documentSchema.safeParse({ ...EXAMPLE_JSON, rating: 5 }).success).toBe(false)
    // Схема в промпте — та же, что у Zod, без примеров у полей со свободным текстом
    expect(withoutKeys(z.toJSONSchema(documentSchema), ['examples', 'prose', 'promptExample'])).toEqual(withoutKeys(schema, ['examples']))
  })

  it('у полей со свободным текстом нет примеров, у полей формата — есть', () => {
    const text = JSON.stringify(schema)
    expect(text).not.toContain('"prose"')
    expect(text).not.toContain('Лучше записаться за день')
    expect(text).not.toContain('Машинкой и ножницами')
    expect(text).toContain('"examples":["60 мин"]')
    // Контакты — заглушки вместо правдоподобных примеров редактора
    expect(text).toContain('"examples":["+7 900 000-00-00"]')
    expect(text).toContain('"examples":["vash_telegram"]')
    expect(text).not.toContain('promptExample')
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
