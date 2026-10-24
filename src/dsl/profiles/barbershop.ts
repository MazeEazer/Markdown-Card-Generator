import type { NicheProfile } from './types.ts'

// Структура — шаблон src/data/templates/barbershop.ts (тест profiles.test.ts следит за совпадением)
export const barbershop: NicheProfile = {
  business: 'barbershop',
  genitive: 'барбершопа',
  renameSections: true,
  theme: 'noir',
  accent: '#cb5d51',
  schemaType: 'HairSalon',
  sections: [
    { slot: 'about', title: 'О нас', inPrompt: true },
    { slot: 'services', title: 'Услуги и цены', inPrompt: true, expected: { hint: 'услуги и цены' } },
    { slot: 'hours', title: 'Часы работы', inPrompt: true, expected: { hint: 'часы работы' } },
    { slot: 'reviews', title: 'Отзывы', inPrompt: false },
    { slot: 'accordion', title: 'Вопросы', inPrompt: false },
    { slot: 'map', title: 'Как добраться', inPrompt: true },
    { slot: 'contacts', title: 'Контакты', inPrompt: true, expected: { hint: 'телефон или мессенджер для записи' } },
  ],
  important: ['каждую названную услугу — отдельной строкой, в том числе комплексы из нескольких услуг'],
  matches(description) {
    // «Стрижка собак, груминг» — не барбершоп
    if (/груминг|собак|кошк|питомц|животн/i.test(description)) return false
    return /барбер|парикмахер|(?<![\p{L}])стрижк|(?<![\p{L}])борода|(?<![\p{L}])бороды/iu.test(description)
  },
}
