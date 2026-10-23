import type { NicheProfile } from './types.ts'

// Один раздел «Услуги и цены» (services) вместо «Направления» + «Стоимость» шаблона: единица цены — в description
export const photographer: NicheProfile = {
  business: 'photographer',
  genitive: 'фотографа',
  renameSections: true,
  theme: 'vercel',
  accent: '#ffffff',
  // Подтипа Photographer у LocalBusiness нет: тип LocalBusiness и knowsAbout
  schemaType: 'LocalBusiness',
  schemaExtra: { knowsAbout: ['Фотосъёмка'] },
  sections: [
    { slot: 'about', title: 'Обо мне', inPrompt: true },
    { slot: 'services', title: 'Услуги и цены', inPrompt: true, expected: { hint: 'услуги и цены с единицей: за час, за съёмку, за день' } },
    { slot: 'hours', title: 'Когда снимаю', inPrompt: true, expected: { hint: 'когда вы снимаете' } },
    { slot: 'reviews', title: 'Отзывы', inPrompt: false },
    { slot: 'accordion', title: 'Вопросы', inPrompt: false },
    { slot: 'map', title: 'Как добраться', inPrompt: true },
    { slot: 'contacts', title: 'Контакты', inPrompt: true, expected: { hint: 'телефон или мессенджер для связи' } },
  ],
  important: ['единица, за которую названа цена, — как в описании (в description услуги)'],
  matches: (description) => /фотограф|фотосъ[её]мк|фотосесс|фотостуди/iu.test(description),
}
