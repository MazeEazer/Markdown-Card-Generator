import type { NicheProfile } from './types.ts'

// «Другое»: порядок разделов тот же, но названия модели не трогаем, оформление не задаём
export const other: NicheProfile = {
  business: 'other',
  genitive: 'такого бизнеса',
  renameSections: false,
  schemaType: 'LocalBusiness',
  sections: [
    { slot: 'about', title: 'О нас', inPrompt: false },
    { slot: 'services', title: 'Услуги и цены', inPrompt: false },
    { slot: 'hours', title: 'Часы работы', inPrompt: false },
    { slot: 'reviews', title: 'Отзывы', inPrompt: false },
    { slot: 'accordion', title: 'Вопросы', inPrompt: false },
    { slot: 'map', title: 'Как добраться', inPrompt: false },
    { slot: 'contacts', title: 'Контакты', inPrompt: false },
  ],
  important: [],
  matches: () => false,
}
