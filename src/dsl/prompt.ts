// Системный промпт для нейросети — строится из той же схемы, что проверяет валидатор.
// Добавили поле или блок в схему — оно само появилось в промпте и в JSON Schema.
import { z } from 'zod'
import { enumOptions, unwrap } from './rules/helpers.ts'
import { BLOCK_NAMES, BLOCKS, type BlockDefinition } from './schema/blocks.ts'
import { type DocumentJson, documentSchema } from './schema/document.ts'
import { BUSINESSES, type BusinessName, FRONTMATTER_EXAMPLE, frontmatterSchema } from './schema/frontmatter.ts'

export type PromptMode = 'markdown' | 'json'

export interface PromptOptions {
  /** markdown — нейросеть пишет разметку; json — заполняет JSON по схеме */
  mode: PromptMode
  /** Вид бизнеса, если пользователь выбрал его в интерфейсе */
  business?: BusinessName
}

/** Поле со свободным текстом (prose в схеме): пример значения нейросеть переписывает как факт. */
function isProse(schema: z.ZodType): boolean {
  return Boolean((unwrap(schema).meta() as { prose?: boolean } | undefined)?.prose)
}

/** Условное значение вместо правдоподобного: «Вопрос 2 — из описания». Номер — чтобы элементы не совпадали. */
function proseHint(schema: z.ZodType, n: number): string {
  return `${unwrap(schema).meta()?.description ?? 'Текст'} ${n} — из описания`
}

const hint = <B extends 'services' | 'accordion'>(block: B, key: keyof (typeof BLOCKS)[B]['item']['shape'], n: number) =>
  proseHint((BLOCKS[block].item.shape as Record<string, z.ZodType>)[key as string], n)

/**
 * Пример блока для промпта: формат из примера в схеме, но значения полей со свободным текстом — условные.
 * Пример в схеме остаётся правдоподобным: по нему редактор строит заготовку блока для человека.
 */
export function promptExample(block: BlockDefinition): string {
  const shape = block.item?.shape as Record<string, z.ZodType> | undefined
  if (!shape) return block.example
  let n = 1
  return block.example
    .split('\n')
    .map((line) => {
      if (!line.trim()) n++ // элементы разделены пустой строкой
      const key = line.match(/^(\w+): /)?.[1]
      return key && shape[key] && isProse(shape[key]) ? `${key}: ${proseHint(shape[key], n)}` : line
    })
    .join('\n')
}

/** Пример документа: показывает формат; текст в нём условный, данные шапки — вымышленные. */
export const EXAMPLE_DOCUMENT = `${FRONTMATTER_EXAMPLE}

## О нас
Пересказ описания своими словами, без новых фактов.

## Услуги и цены
${promptExample(BLOCKS.services)}

## Часы работы
${BLOCKS.hours.example}

## Вопросы
${promptExample(BLOCKS.accordion)}

## Как добраться
${BLOCKS.map.example}

## Контакты
${BLOCKS.contacts.example}
`

/** Тот же пример в виде JSON — для режима «JSON по схеме». */
export const EXAMPLE_JSON: DocumentJson = {
  name: 'Барбершоп «Борода»',
  title: 'Чем занимаетесь — коротко, из описания',
  theme: 'noir',
  accent: '#c0392b',
  business: 'barbershop',
  phone: '+7 900 000-00-00',
  address: 'ул. Ленина, 10',
  city: 'Самара',
  currency: 'RUB',
  contacts: { telegram: 'vash_telegram', whatsapp: '+7 900 000-00-00', primary: 'telegram' },
  sections: [
    { type: 'text', title: 'О нас', content: 'Пересказ описания своими словами, без новых фактов.' },
    {
      type: 'services',
      title: 'Услуги и цены',
      items: [
        { title: hint('services', 'title', 1), price: '1500', duration: '60 мин', description: hint('services', 'description', 1) },
        // Без description и duration: необязательные поля пишутся, только если они есть в описании
        { title: hint('services', 'title', 2), price: 'от 800' },
      ],
    },
    { type: 'hours', title: 'Часы работы', lines: ['пн–пт: 10:00–20:00', 'сб: 11:00–18:00', 'вс: выходной'] },
    {
      type: 'accordion',
      title: 'Вопросы',
      items: [
        { title: hint('accordion', 'title', 1), content: hint('accordion', 'content', 1) },
        { title: hint('accordion', 'title', 2), content: hint('accordion', 'content', 2) },
      ],
    },
    { type: 'map', title: 'Как добраться' },
    { type: 'contacts', title: 'Контакты' },
  ],
}

/** Примеры для нейросети: у свободного текста (prose) — никаких, у контактов — заглушка promptExample. */
function withoutProseExamples(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutProseExamples)
  if (!node || typeof node !== 'object') return node
  const { prose, promptExample, examples, ...rest } = node as Record<string, unknown>
  const cleaned = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, withoutProseExamples(value)]))
  if (prose || examples === undefined) return cleaned
  return { ...cleaned, examples: promptExample === undefined ? examples : [promptExample] }
}

/** JSON Schema документа — для structured output и для промпта в режиме json. */
export function getJsonSchema(): Record<string, unknown> {
  return withoutProseExamples(z.toJSONSchema(documentSchema)) as Record<string, unknown>
}

/** Строка описания поля: «- phone — Телефон для звонков. Пример: +7 900 000-00-00». Устаревшие поля не предлагаем. */
function describeField(key: string, schema: z.ZodType, indent = ''): string[] {
  const inner = unwrap(schema)
  const meta = inner.meta() as
    | { description?: string; examples?: unknown[]; deprecated?: boolean; prose?: boolean; promptExample?: string }
    | undefined
  if (meta?.deprecated) return []
  const required = schema instanceof z.ZodOptional ? '' : ' (обязательно)'
  let line = `${indent}- ${key}${required} — ${meta?.description ?? ''}`

  const options = enumOptions(inner)
  // У тем, видов бизнеса и иконок варианты уже перечислены в описании с пояснениями
  if (options && !meta?.description?.includes(options[0])) line += `. Значения: ${options.join(', ')}`
  // У свободного текста пример не показываем, у контактов — заглушку: нейросеть переписывает пример как факт
  const example = meta?.prose ? undefined : (meta?.promptExample ?? meta?.examples?.[0])
  if (example !== undefined && !options) line += `. Пример: ${example}`

  if (inner instanceof z.ZodObject) {
    return [`${line}:`, ...Object.entries(inner.shape as Record<string, z.ZodType>).flatMap(([k, v]) => describeField(k, v, `${indent}  `))]
  }
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject) {
    const fields = Object.entries(inner.element.shape as Record<string, z.ZodType>)
    return [`${line}. Список, у каждого элемента поля:`, ...fields.flatMap(([k, v]) => describeField(k, v, `${indent}  `))]
  }
  return [line]
}

function frontmatterReference(): string {
  return Object.entries(frontmatterSchema.shape as Record<string, z.ZodType>)
    .flatMap(([key, schema]) => describeField(key, schema))
    .join('\n')
}

function blocksReference(): string {
  return BLOCK_NAMES.map((name) => {
    const block: BlockDefinition = BLOCKS[name]
    const attrs = Object.entries(block.attrs.shape as Record<string, z.ZodType>).flatMap(([k, v]) => describeField(k, v, '  '))
    const fields = block.item
      ? Object.entries(block.item.shape as Record<string, z.ZodType>).flatMap(([k, v]) => describeField(k, v, '  '))
      : []
    return [
      `:::${name} — ${block.label}: ${block.description}.`,
      ...(attrs.length ? ['Атрибуты в строке открытия:', ...attrs] : []),
      ...(fields.length ? ['Поля элемента:', ...fields] : [block.body ?? 'Внутри — текст как есть.']),
      `Пример:\n${promptExample(block)}`,
    ].join('\n')
  }).join('\n\n')
}

const RULES = `Правила:
1. Используй только факты из описания пользователя. Не придумывай телефон, мессенджеры, адрес, цены, часы работы, отзывы, имена, годы работы и другие факты. Если чего-то нет в описании — не пиши это поле или раздел.
2. Необязательные поля элементов — description и duration у услуг, rating и date у отзывов и другие — пиши, только если это есть в описании. Нет в описании — не пиши поле совсем. Не дописывай, из чего состоит услуга, сколько она длится, какие материалы используются.
3. Текст разделов (например, «О нас») — только пересказ описания своими словами. Не добавляй новых фактов: услуг, опыта, материалов, гарантий, обещаний.
4. Блок вопросов и ответов (:::accordion) — только с вопросами и ответами, которые есть в описании. Нет их в описании — не делай этот блок. Не придумывай вопросы про оплату, запись, парковку и т. п.
5. Карту (:::map, раздел «Как добраться») делай, только если в описании есть адрес, куда приходят клиенты. Работа онлайн или на выезде без адреса — карты нет.
6. phone — только если номер дан для звонков («звоните», «телефон», «тел.») или без указания мессенджера. Номер, данный только для WhatsApp или Telegram («пишите в вотсап»), пиши только в contacts (whatsapp), phone не заполняй: на сайте phone — это кнопка «Позвонить». Телефон пиши в виде +7 900 000-00-00. В telegram, vk, instagram — только имя пользователя, без @ и без ссылки. В whatsapp — номер телефона. В max — ссылка на профиль https://max.ru/…, если она есть в описании.
7. primary — только один из указанных контактов или phone (если указан телефон).
8. Пиши по-русски, коротко и понятно для клиентов бизнеса. Разделы — о том, что важно клиенту: услуги, цены, как добраться, частые вопросы.
9. Примеры ниже показывают только формат. Текст «… — из описания» в них условный — подставляй вместо него данные из описания. Не переноси из примеров названия и описания услуг, цены, отзывы и тексты.`

const MARKDOWN_SYNTAX = `Язык разметки MD Card:
- Документ начинается с шапки между строками ---. В шапке — поля в формате YAML «поле: значение».
- Значения с двоеточием или # бери в кавычки: title: "Стрижки: мужские и детские", accent: "#c0392b".
- После шапки — разделы. Раздел начинается строкой «## Название». Текст раздела — обычный Markdown.
- Блоки внутри раздела: строка «:::имя», затем элементы, затем строка «:::». Каждый блок обязательно закрывай строкой «:::».
- Элементы блока разделяются пустой строкой. Поле элемента — «поле: значение» одной строкой; названия полей — латиницей, как в описании.
- Таблица — обычная Markdown-таблица: строка заголовков, строка | --- |, строки данных.`

/** Системный промпт для генерации сайта по описанию. */
export function buildSystemPrompt({ mode, business }: PromptOptions): string {
  const parts = [
    'Ты помогаешь владельцу малого бизнеса сделать сайт-визитку. По описанию бизнеса своими словами ты составляешь сайт на языке разметки MD Card.',
  ]
  if (business) parts.push(`Вид бизнеса: ${BUSINESSES[business]} (business: ${business}).`)
  parts.push(RULES)

  if (mode === 'markdown') {
    parts.push(
      MARKDOWN_SYNTAX,
      `Поля шапки:\n${frontmatterReference()}`,
      `Блоки:\n${blocksReference()}`,
      `Пример документа:\n${EXAMPLE_DOCUMENT}`,
      'Ответ — только документ на языке MD Card, начиная со строки ---. Без пояснений и без ``` вокруг.',
    )
  } else {
    parts.push(
      `Поля сайта:\n${frontmatterReference()}`,
      `Разделы (sections) — список объектов; поле type задаёт вид раздела: text — текст, table — таблица, ${BLOCK_NAMES.map((name) => `${name} — ${BLOCKS[name].label.toLowerCase()}`).join(', ')}.`,
      `JSON Schema ответа:\n${JSON.stringify(getJsonSchema())}`,
      `Пример ответа:\n${JSON.stringify(EXAMPLE_JSON, null, 2)}`,
      'Ответ — только JSON-объект по схеме. Без пояснений и без ``` вокруг.',
    )
  }

  return parts.join('\n\n')
}
