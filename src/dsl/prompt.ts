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

/** Пример документа: показывает формат, данные в нём вымышленные. */
export const EXAMPLE_DOCUMENT = `${FRONTMATTER_EXAMPLE}

## О нас
Стрижём бороды и мужские головы с 2015 года. Работаем без спешки.

## Цены
| Услуга | Цена |
| --- | --- |
| Мужская стрижка | 1500 |
| Оформление бороды | 800 |

## Услуги
${BLOCKS.cards.example}

## Вопросы
${BLOCKS.accordion.example}
`

/** Тот же пример в виде JSON — для режима «JSON по схеме». */
export const EXAMPLE_JSON: DocumentJson = {
  name: 'Барбершоп «Борода»',
  title: 'Мужские стрижки и уход за бородой',
  theme: 'noir',
  accent: '#c0392b',
  business: 'barbershop',
  phone: '+7 999 123-45-67',
  address: 'ул. Ленина, 10',
  city: 'Самара',
  currency: 'RUB',
  contacts: { telegram: 'barber_ivan', whatsapp: '+7 999 123-45-67', primary: 'telegram' },
  sections: [
    { type: 'text', title: 'О нас', content: 'Стрижём бороды и мужские головы с 2015 года. Работаем без спешки.' },
    {
      type: 'table',
      title: 'Цены',
      headers: ['Услуга', 'Цена'],
      rows: [
        ['Мужская стрижка', '1500'],
        ['Оформление бороды', '800'],
      ],
    },
    {
      type: 'cards',
      title: 'Услуги',
      items: [
        { title: 'Мужская стрижка', description: 'Машинкой и ножницами, мытьё головы', icon: 'star', tags: 'мужская, классика' },
        { title: 'Оформление бороды', description: 'Моделирование, горячее полотенце', icon: 'zap' },
      ],
    },
    {
      type: 'accordion',
      title: 'Вопросы',
      items: [
        { title: 'Нужна ли запись заранее?', content: 'Лучше записаться за день, но можно и прийти без записи' },
        { title: 'Можно ли оплатить картой?', content: 'Да, принимаем карты и СБП' },
      ],
    },
  ],
}

/** JSON Schema документа — для structured output и для промпта в режиме json. */
export function getJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(documentSchema) as Record<string, unknown>
}

/** Строка описания поля: «- phone — Телефон для звонков. Пример: +7 999 123-45-67». Устаревшие поля не предлагаем. */
function describeField(key: string, schema: z.ZodType, indent = ''): string[] {
  const inner = unwrap(schema)
  const meta = inner.meta() as { description?: string; examples?: unknown[]; deprecated?: boolean } | undefined
  if (meta?.deprecated) return []
  const required = schema instanceof z.ZodOptional ? '' : ' (обязательно)'
  let line = `${indent}- ${key}${required} — ${meta?.description ?? ''}`

  const options = enumOptions(inner)
  // У тем, видов бизнеса и иконок варианты уже перечислены в описании с пояснениями
  if (options && !meta?.description?.includes(options[0])) line += `. Значения: ${options.join(', ')}`
  const example = meta?.examples?.[0]
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
      `Пример:\n${block.example}`,
    ].join('\n')
  }).join('\n\n')
}

const RULES = `Правила:
1. Используй только факты из описания пользователя. Не придумывай телефон, мессенджеры, адрес, цены, отзывы, имена, годы работы и другие факты. Если чего-то нет в описании — не пиши это поле или раздел.
2. Телефон пиши в виде +7 999 123-45-67. В telegram, vk, instagram — только имя пользователя, без @ и без ссылки. В whatsapp — номер телефона. В max — ссылка на профиль https://max.ru/…, если она есть в описании.
3. primary — только один из указанных контактов или phone (если указан телефон).
4. Пиши по-русски, коротко и понятно для клиентов бизнеса. Разделы — о том, что важно клиенту: услуги, цены, как добраться, частые вопросы.
5. Данные из примеров ниже вымышлены: бери из примеров только формат.`

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
