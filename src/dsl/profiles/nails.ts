import type { NicheProfile } from './types.ts'

export const nails: NicheProfile = {
  business: 'nails',
  genitive: 'мастера маникюра',
  renameSections: true,
  theme: 'glass',
  accent: '#8e44ad',
  schemaType: 'NailSalon',
  sections: [
    { slot: 'about', title: 'О студии', inPrompt: true },
    { slot: 'services', title: 'Услуги и цены', inPrompt: true, expected: { hint: 'услуги, цены и длительность процедур' } },
    { slot: 'hours', title: 'Часы работы', inPrompt: true, expected: { hint: 'часы работы' } },
    { slot: 'reviews', title: 'Отзывы', inPrompt: false },
    { slot: 'accordion', title: 'Вопросы', inPrompt: false },
    { slot: 'map', title: 'Как добраться', inPrompt: true },
    { slot: 'contacts', title: 'Контакты', inPrompt: true, expected: { hint: 'телефон или мессенджер для записи' } },
  ],
  important: ['длительность процедур и отдельные услуги вроде снятия покрытия — только если они названы в описании'],
  matches: (description) => /маникюр|педикюр|(?<![\p{L}])ногт|гель-?лак|шеллак/iu.test(description),
}
