import type { NicheProfile } from './types.ts'

export const tutor: NicheProfile = {
  business: 'tutor',
  genitive: 'репетитора',
  renameSections: true,
  theme: 'minimal',
  accent: '#2563eb',
  // Тип LocalBusiness + EducationalOrganization; если Rich Results Test даст предупреждения — оставить 'LocalBusiness'
  schemaType: ['LocalBusiness', 'EducationalOrganization'],
  sections: [
    { slot: 'about', title: 'Обо мне', inPrompt: true },
    { slot: 'services', title: 'Занятия и цены', inPrompt: true, expected: { hint: 'занятия, цены и формат занятий' } },
    { slot: 'hours', title: 'Расписание', inPrompt: true, expected: { hint: 'когда вы занимаетесь' } },
    { slot: 'reviews', title: 'Отзывы', inPrompt: false },
    { slot: 'accordion', title: 'Вопросы', inPrompt: false },
    { slot: 'map', title: 'Как добраться', inPrompt: true },
    { slot: 'contacts', title: 'Контакты', inPrompt: true, expected: { hint: 'телефон или мессенджер для связи' } },
  ],
  important: ['формат занятий, длительность урока и цена за занятие — только если названы в описании'],
  matches: (description) => /репетитор|(?<![\p{L}])егэ|(?<![\p{L}])огэ|преподава|учител/iu.test(description),
}
