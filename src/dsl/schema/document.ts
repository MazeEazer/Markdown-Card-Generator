import { z } from 'zod'
import { BLOCKS } from './blocks.ts'
import { frontmatterSchema } from './frontmatter.ts'

// Весь документ в виде JSON — для AI-режима «JSON по схеме» (этап 5): нейросеть заполняет данные,
// fromJson.ts превращает их в CardData, serialize.ts — в разметку. Поля блоков — те же, что в blocks.ts.

const title = z.string().meta({ description: 'Название раздела', examples: ['Цены'] })

const sectionSchema = z.discriminatedUnion('type', [
  z
    .strictObject({
      type: z.literal('text'),
      title,
      content: z.string().meta({ description: 'Текст раздела, можно Markdown: **жирный**, списки через «- »' }),
    })
    .meta({ description: 'Раздел с текстом' }),
  z
    .strictObject({
      type: z.literal('table'),
      title,
      headers: z.array(z.string()).meta({ description: 'Заголовки столбцов', examples: [['Услуга', 'Цена']] }),
      rows: z.array(z.array(z.string())).meta({ description: 'Строки таблицы', examples: [[['Стрижка', '1500']]] }),
    })
    .meta({ description: 'Таблица, например цены' }),
  z
    .strictObject({
      type: z.literal('cards'),
      title,
      items: z.array(BLOCKS.cards.item.omit({ link: true })),
    })
    .meta({ description: BLOCKS.cards.description }),
  z
    .strictObject({
      type: z.literal('accordion'),
      title,
      items: z.array(BLOCKS.accordion.item),
    })
    .meta({ description: BLOCKS.accordion.description }),
  z
    .strictObject({
      type: z.literal('code'),
      title,
      ...BLOCKS.code.attrs.shape,
      code: z.string().meta({ description: 'Текст кода' }),
    })
    .meta({ description: BLOCKS.code.description }),
  z
    .strictObject({ type: z.literal('services'), title, items: z.array(BLOCKS.services.item) })
    .meta({ description: BLOCKS.services.description }),
  z
    .strictObject({
      type: z.literal('hours'),
      title,
      lines: z
        .array(z.string())
        .meta({ description: BLOCKS.hours.body, examples: [['пн–пт: 10:00–20:00', 'сб: 11:00–18:00', 'вс: выходной']] }),
    })
    .meta({ description: BLOCKS.hours.description }),
  z
    .strictObject({ type: z.literal('reviews'), title, items: z.array(BLOCKS.reviews.item) })
    .meta({ description: BLOCKS.reviews.description }),
  z
    .strictObject({ type: z.literal('map'), title, ...BLOCKS.map.item.shape })
    .meta({ description: BLOCKS.map.description }),
  z.strictObject({ type: z.literal('contacts'), title }).meta({ description: BLOCKS.contacts.description }),
])

export const documentSchema = z
  .strictObject({
    ...frontmatterSchema.omit({ location: true }).shape,
    sections: z.array(sectionSchema).meta({ description: 'Разделы сайта по порядку' }),
  })
  .meta({ description: 'Сайт целиком: поля шапки и разделы' })

export type DocumentJson = z.infer<typeof documentSchema>
export type SectionJson = z.infer<typeof sectionSchema>
