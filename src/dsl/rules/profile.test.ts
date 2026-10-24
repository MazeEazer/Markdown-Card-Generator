import { describe, expect, it } from 'vitest'
import { MISSING_DATA_CODES } from '../codes.ts'
import { barbershop } from '../../data/templates/barbershop.ts'
import { nails } from '../../data/templates/nails.ts'
import { photographer } from '../../data/templates/photographer.ts'
import { tutor } from '../../data/templates/tutor.ts'
import { findAll, underlined } from './testHelpers.ts'

const doc = (business: string, body = '') => `---\nname: Тест\nphone: +7 999 123-45-67\nbusiness: ${business}\n---\n\n${body}`

describe('профиль ниши — подсказка о недостающих разделах', () => {
  it('нет услуг, часов и контактов — три предупреждения с понятным текстом', () => {
    const text = doc('barbershop', '## О нас\nТекст\n')
    const found = findAll(text, 'profile-section-missing')
    expect(found.map((d) => d.message)).toEqual([
      'Для барбершопа обычно указывают услуги и цены — добавьте раздел «Услуги и цены»',
      'Для барбершопа обычно указывают часы работы — добавьте раздел «Часы работы»',
      'Для барбершопа обычно указывают телефон или мессенджер для записи — добавьте раздел «Контакты»',
    ])
    expect(found.every((d) => d.severity === 'warning')).toBe(true)
    expect(underlined(text, found[0])).toBe('barbershop')
  })

  it('название раздела — по профилю ниши', () => {
    const [, hours] = findAll(doc('tutor', '## Обо мне\nТекст\n'), 'profile-section-missing')
    expect(hours.message).toBe('Для репетитора обычно указывают когда вы занимаетесь — добавьте раздел «Расписание»')
    expect(findAll(doc('photographer'), 'profile-section-missing')[0].message).toContain('за час, за съёмку, за день')
  })

  it('все разделы есть — замечаний нет; блок может стоять в разделе с любым названием', () => {
    const text = doc('nails', '## Прайс\n:::services\ntitle: Маникюр\n:::\n\n## Когда\n:::hours\nпн: 10:00–20:00\n:::\n\n## Связь\n:::contacts\n:::\n')
    expect(findAll(text, 'profile-section-missing')).toEqual([])
  })

  it('other, без ниши и незнакомая ниша — тишина', () => {
    expect(findAll(doc('other'), 'profile-section-missing')).toEqual([])
    expect(findAll('---\nname: Тест\n---\n\n## О нас\nТекст\n', 'profile-section-missing')).toEqual([])
    expect(findAll(doc('spa'), 'profile-section-missing')).toEqual([])
  })

  it.each([
    ['barbershop', barbershop],
    ['nails', nails],
    ['tutor', tutor],
    ['photographer', photographer],
  ])('шаблон %s замечаний не получает', (_name, template) => {
    expect(findAll(template, 'profile-section-missing')).toEqual([])
  })

  it('это «нехватка данных»: нейросети такое замечание не отправляется', () => {
    expect(MISSING_DATA_CODES.has('profile-section-missing')).toBe(true)
  })
})
