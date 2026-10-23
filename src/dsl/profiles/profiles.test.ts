import { describe, expect, it } from 'vitest'
import { barbershop as barbershopTemplate } from '../../data/templates/barbershop.ts'
import { nails as nailsTemplate } from '../../data/templates/nails.ts'
import { photographer as photographerTemplate } from '../../data/templates/photographer.ts'
import { tutor as tutorTemplate } from '../../data/templates/tutor.ts'
import { parseDocument } from '../parser.ts'
import {
  applyNicheProfile,
  applySectionOrder,
  applyStyle,
  BUSINESS_FIXED,
  PROFILE_SECTIONS,
  PROFILE_STYLE,
  resolveBusiness,
  setFrontmatterField,
} from './apply.ts'
import { detectNiche, NICHES, PROFILES, profileOf } from './index.ts'

const titles = (text: string) => parseDocument(text).sections.map((s) => s.title)
const head = (business: string, extra = '') => `---\nname: Тест\nphone: +7 999 123-45-67\nbusiness: ${business}\n${extra}---\n\n`

describe('профиль = шаблон', () => {
  const templates = { barbershop: barbershopTemplate, nails: nailsTemplate, tutor: tutorTemplate, photographer: photographerTemplate }

  it.each(['barbershop', 'nails', 'tutor'] as const)('%s: порядок и названия разделов, тема и accent как в шаблоне', (id) => {
    const profile = PROFILES[id]
    const template = templates[id]
    const expected = parseDocument(template).sections.map((s) => s.title)
    // разделы шаблона — подпоследовательность профиля с теми же названиями и порядком
    const profileTitles = profile.sections.map((s) => s.title)
    let at = 0
    for (const title of expected) {
      at = profileTitles.indexOf(title, at)
      expect(at, `«${title}» есть в профиле по порядку`).toBeGreaterThanOrEqual(0)
    }
    const data = parseDocument(template).frontmatter!.data
    expect(data.theme).toBe(profile.theme)
    expect(data.accent).toBe(profile.accent)
  })

  it('photographer: один раздел «Услуги и цены» вместо «Направления» + «Стоимость»; остальной порядок и тема как в шаблоне', () => {
    const profile = PROFILES.photographer
    const rest = parseDocument(photographerTemplate).sections.map((s) => s.title).filter((t) => t !== 'Направления' && t !== 'Стоимость')
    const profileRest = profile.sections.map((s) => s.title).filter((t) => t !== 'Услуги и цены')
    let at = 0
    for (const title of rest) {
      at = profileRest.indexOf(title, at)
      expect(at, title).toBeGreaterThanOrEqual(0)
    }
    expect(profile.sections.map((s) => s.title)).toContain('Услуги и цены')
    const data = parseDocument(photographerTemplate).frontmatter!.data
    expect(data.theme).toBe(profile.theme)
    expect(data.accent).toBe(profile.accent)
  })

  it('отзывы и вопросы — в профиле для порядка, но не в промпте', () => {
    for (const niche of NICHES) {
      for (const slot of ['reviews', 'accordion'] as const) {
        expect(niche.sections.find((s) => s.slot === slot)?.inPrompt, `${niche.business}/${slot}`).toBe(false)
      }
    }
  })

  it('other: названия не принудительные, оформление не задано', () => {
    expect(PROFILES.other.renameSections).toBe(false)
    expect(PROFILES.other.theme).toBeUndefined()
    expect(profileOf('nope')).toBeNull()
  })
})

describe('detectNiche', () => {
  it.each([
    ['Барбершоп «Топор» на Садовой, мужская стрижка 1200', 'barbershop'],
    ['Парикмахерская, стрижки и борода', 'barbershop'],
    ['Мастер маникюра, гель-лак, педикюр', 'nails'],
    ['Репетитор по математике, готовлю к ЕГЭ', 'tutor'],
    ['Фотограф, свадьбы и фотосессии', 'photographer'],
  ])('«%s» → %s', (description, expected) => expect(detectNiche(description)).toBe(expected))

  it.each([
    'Стрижка собак, груминг',
    'Груминг: стрижка кошек и собак, мытьё',
    'Стригу питомцев на дому',
    'Кондитер, торты на заказ',
    'Салон красоты: маникюр и стрижка',
    'Ремонт обуви',
  ])('«%s» → не угадываем (null)', (description) => expect(detectNiche(description)).toBeNull())
})

describe('resolveBusiness', () => {
  const doc = (business?: string) => `---\nname: Тест\n${business ? `business: ${business}\n` : ''}---\n\n## О нас\nТекст\n`

  it('ниша выбрана пользователем — ставится она (заменяет и добавляет)', () => {
    expect(resolveBusiness(doc('nails'), 'barbershop', 'что угодно')).toEqual({ text: doc('barbershop'), applied: [BUSINESS_FIXED] })
    expect(resolveBusiness(doc(), 'tutor', 'что угодно').text).toBe(doc('tutor'))
    expect(resolveBusiness(doc('tutor'), 'tutor', 'x')).toEqual({ text: doc('tutor'), applied: [] })
  })

  it('не выбрана, модель угадала нишу без слов в описании — other', () => {
    expect(resolveBusiness(doc('barbershop'), undefined, 'Стрижка собак, груминг')).toEqual({ text: doc('other'), applied: [BUSINESS_FIXED] })
    expect(resolveBusiness(doc('nails'), undefined, 'Кондитер, торты на заказ').text).toBe(doc('other'))
  })

  it('не выбрана, слова ниши в описании есть — ниша модели остаётся', () => {
    const text = doc('barbershop')
    expect(resolveBusiness(text, undefined, 'Барбершоп «Топор», мужская стрижка')).toEqual({ text, applied: [] })
  })

  it('business нет или other — не добавляем и не меняем; незнакомое значение — other', () => {
    expect(resolveBusiness(doc(), undefined, 'Барбершоп').text).toBe(doc())
    expect(resolveBusiness(doc('other'), undefined, 'Барбершоп').text).toBe(doc('other'))
    expect(resolveBusiness(doc('spa'), undefined, 'Барбершоп').text).toBe(doc('other'))
  })
})

describe('setFrontmatterField', () => {
  it('заменяет строку или добавляет в конец шапки', () => {
    const text = '---\nname: A\ntheme: auto\n---\n\n## X\nt\n'
    expect(setFrontmatterField(text, 'theme', 'noir')).toBe('---\nname: A\ntheme: noir\n---\n\n## X\nt\n')
    expect(setFrontmatterField(text, 'accent', '"#fff"')).toBe('---\nname: A\ntheme: auto\naccent: "#fff"\n---\n\n## X\nt\n')
    expect(setFrontmatterField('---\nname: A\naccent:\n---\n', 'accent', 'x')).toBe('---\nname: A\naccent: x\n---\n')
  })
})

describe('applySectionOrder', () => {
  const messy = `${head('barbershop')}## Контакты\n:::contacts\n:::\n\n## Наши услуги\n:::services\ntitle: Стрижка\nprice: 1500\n:::\n\n## Отзывы\n:::reviews\ntext: Лучший мастер\n:::\n\n## Мы\nТекст о нас\n\n## Время\n:::hours\nпн–пт: 10:00–20:00\n:::\n`

  it('порядок и названия по профилю', () => {
    const result = applySectionOrder(messy, 'barbershop')
    expect(titles(result.text)).toEqual(['О нас', 'Услуги и цены', 'Часы работы', 'Отзывы', 'Контакты'])
    expect(result.applied).toEqual([PROFILE_SECTIONS])
    // содержимое разделов не изменилось
    expect(result.text).toContain('## Услуги и цены\n:::services\ntitle: Стрижка\nprice: 1500\n:::')
    expect(result.text).toContain('## О нас\nТекст о нас')
    expect(result.text.endsWith('\n') && !result.text.endsWith('\n\n')).toBe(true)
  })

  it('названия у каждой ниши свои', () => {
    expect(titles(applySectionOrder(messy.replace('barbershop', 'tutor'), 'tutor').text)).toEqual(['Обо мне', 'Занятия и цены', 'Расписание', 'Отзывы', 'Контакты'])
    expect(titles(applySectionOrder(messy.replace('barbershop', 'nails'), 'nails').text)).toEqual(['О студии', 'Услуги и цены', 'Часы работы', 'Отзывы', 'Контакты'])
    expect(titles(applySectionOrder(messy.replace('barbershop', 'photographer'), 'photographer').text)).toEqual(['Обо мне', 'Услуги и цены', 'Когда снимаю', 'Отзывы', 'Контакты'])
  })

  it('other: порядок как в профиле, названия модели не трогаем', () => {
    const result = applySectionOrder(messy.replace('barbershop', 'other'), 'other')
    expect(titles(result.text)).toEqual(['Мы', 'Наши услуги', 'Время', 'Отзывы', 'Контакты'])
  })

  it('разделы вне профиля («Адреса», «Удобства») — после часов и перед отзывами, названия сохраняются', () => {
    const text = `${head('barbershop')}## Контакты\n:::contacts\n:::\n\n## Адреса\n:::cards\ntitle: ул. Садовая, 5\nicon: map-pin\n:::\n\n## Удобства\n:::amenities\nkey: wifi\n:::\n\n## Отзывы\n:::reviews\ntext: x\n:::\n\n## Часы\n:::hours\nпн: 10:00–20:00\n:::\n\n## О нас\nТекст\n`
    expect(titles(applySectionOrder(text, 'barbershop').text)).toEqual(['О нас', 'Часы работы', 'Адреса', 'Удобства', 'Отзывы', 'Контакты'])
  })

  it('уже в порядке — текст не меняется; разделы не добавляются и не удаляются', () => {
    const ordered = `${head('barbershop')}## О нас\nТекст\n\n## Контакты\n:::contacts\n:::\n`
    expect(applySectionOrder(ordered, 'barbershop')).toEqual({ text: ordered, applied: [] })
    expect(titles(applySectionOrder(messy, 'barbershop').text)).toHaveLength(5)
  })

  it('не ниша из профилей — без изменений', () => {
    expect(applySectionOrder(messy, undefined)).toEqual({ text: messy, applied: [] })
  })
})

describe('applyStyle', () => {
  it('theme и accent ниши — если модель не задала (нет или auto)', () => {
    const result = applyStyle(head('barbershop'), 'barbershop')
    expect(parseDocument(result.text).frontmatter!.data).toMatchObject({ theme: 'noir', accent: '#cb5d51' })
    expect(result.applied).toEqual([PROFILE_STYLE])
    const auto = applyStyle(head('nails', 'theme: auto\naccent: auto\n'), 'nails')
    expect(parseDocument(auto.text).frontmatter!.data).toMatchObject({ theme: 'glass', accent: '#8e44ad' })
  })

  it('заданное моделью не трогаем', () => {
    const text = head('barbershop', 'theme: minimal\naccent: "#112233"\n')
    expect(applyStyle(text, 'barbershop')).toEqual({ text, applied: [] })
  })

  it('other и без ниши — оформление не задаём', () => {
    expect(applyStyle(head('other'), 'other')).toEqual({ text: head('other'), applied: [] })
  })
})

describe('applyNicheProfile', () => {
  it('всё вместе: ниша → разделы → оформление', () => {
    const text = `---\nname: Лапки\nphone: +7 999 123-45-67\nbusiness: other\n---\n\n## Контакты\n:::contacts\n:::\n\n## Прайс\n:::services\ntitle: Маникюр\nprice: 900\n:::\n`
    const result = applyNicheProfile(text, 'nails', 'Маникюр 900')
    expect(parseDocument(result.text).frontmatter!.data).toMatchObject({ business: 'nails', theme: 'glass', accent: '#8e44ad' })
    expect(titles(result.text)).toEqual(['Услуги и цены', 'Контакты'])
    expect(result.applied).toEqual([BUSINESS_FIXED, PROFILE_SECTIONS, PROFILE_STYLE])
  })

  it('без ниши ничего не происходит', () => {
    const text = `---\nname: A\n---\n\n## Х\nт\n`
    expect(applyNicheProfile(text, undefined, 'описание')).toEqual({ text, applied: [] })
  })
})
