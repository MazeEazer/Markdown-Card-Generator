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
  /** Поля одного элемента; null — у блока нет элементов (code, contacts) */
  item: z.ZodObject | null
  /** Что писать внутри блока без элементов — для справки и промпта */
  body?: string
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
        link: z.url().meta({ description: 'То же, что url (устаревшее)', deprecated: true }).optional(),
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
    body: 'Внутри — текст кода как есть.',
    example: `:::code lang="js"
console.log('Привет!')
:::`,
  },
  services: {
    name: 'services',
    label: 'Услуги',
    description: 'Услуги с ценами и кнопкой «Записаться», которая ведёт на главный контакт (contacts.primary)',
    attrs: z.strictObject({}),
    item: z
      .strictObject({
        title: text('Название услуги', 'Мужская стрижка'),
        price: text('Цена числом, без ₽: 1500, «от 1500» или «1500–2000»; валюта — в шапке (currency)', '1500').optional(),
        duration: text('Сколько длится', '60 мин').optional(),
        description: text('Что входит в услугу', 'Машинкой и ножницами, мытьё головы и укладка').optional(),
      })
      .meta({ description: 'Услуга' }),
    example: `:::services
title: Мужская стрижка
price: 1500
duration: 60 мин
description: Машинкой и ножницами, мытьё головы и укладка

title: Оформление бороды
price: от 800
duration: 30 мин
description: Моделирование, горячее полотенце
:::`,
  },
  contacts: {
    name: 'contacts',
    label: 'Контакты',
    description:
      'Телефон, адрес и кнопки мессенджеров. Данные берутся из шапки: phone, address, city, contacts — ссылки сайт строит сам',
    attrs: z.strictObject({}),
    item: null,
    body: 'Внутри ничего писать не нужно: блок показывает контакты из шапки.',
    example: `:::contacts
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
