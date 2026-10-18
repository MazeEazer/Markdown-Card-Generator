import { z } from 'zod'
import { iconSchema } from './icons.ts'

// Блоки `:::name … :::` внутри секций. Элементы блока разделяются пустой строкой, поля — `ключ: значение`.

export interface BlockDefinition {
  name: string
  /** Название для человека: в подсказках и справке */
  label: string
  description: string
  /** Атрибуты строки открытия: `:::code lang="js"` */
  attrs: z.ZodObject
  /** Поля одного элемента; null — у блока нет элементов, тело — свободный текст (code) */
  item: z.ZodObject | null
  example: string
}

const text = (description: string, example: string) => z.string().meta({ description, examples: [example] })

export const BLOCKS = {
  cards: {
    name: 'cards',
    label: 'Карточки',
    description: 'Сетка карточек: работы, преимущества, направления',
    attrs: z.strictObject({}),
    item: z
      .strictObject({
        title: text('Заголовок карточки', 'Мужская стрижка'),
        description: text('Текст карточки', 'Машинкой и ножницами, мытьё головы').optional(),
        icon: iconSchema.optional(),
        url: z.url().meta({ description: 'Ссылка — карточка становится кликабельной', examples: ['https://t.me/barber_ivan'] }).optional(),
        link: z.url().meta({ description: 'То же, что url (устаревшее)' }).optional(),
        tags: text('Метки через запятую', 'мужская, детская').optional(),
      })
      .meta({ description: 'Карточка' }),
    example: `:::cards
title: Мужская стрижка
description: Машинкой и ножницами, мытьё головы
icon: star
tags: мужская, классика

title: Оформление бороды
description: Моделирование, горячее полотенце
icon: zap
:::`,
  },
  accordion: {
    name: 'accordion',
    label: 'Вопросы и ответы',
    description: 'Раскрывающийся список: частые вопросы, условия, правила',
    attrs: z.strictObject({}),
    item: z
      .strictObject({
        title: text('Вопрос', 'Нужна ли запись заранее?'),
        content: text('Ответ', 'Лучше записаться за день, но можно и прийти без записи'),
      })
      .meta({ description: 'Вопрос и ответ' }),
    example: `:::accordion
title: Нужна ли запись заранее?
content: Лучше записаться за день, но можно и прийти без записи

title: Можно ли оплатить картой?
content: Да, принимаем карты и СБП
:::`,
  },
  code: {
    name: 'code',
    label: 'Код',
    description: 'Фрагмент программного кода с подсветкой',
    attrs: z.strictObject({
      lang: text('Язык программирования для подсветки', 'js').optional(),
    }),
    item: null,
    example: `:::code lang="js"
console.log('Привет!')
:::`,
  },
} as const satisfies Record<string, BlockDefinition>

export type BlockName = keyof typeof BLOCKS

export const BLOCK_NAMES = Object.keys(BLOCKS) as BlockName[]

/** Другие привычные имена блоков. */
export const BLOCK_ALIASES: Record<string, string> = {
  faq: 'accordion',
  questions: 'accordion',
  grid: 'cards',
}
