import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../lib/parser.ts'
import { MANUAL_RUNS } from './__fixtures__/manual.ts'
import { STEP8_RUNS } from './__fixtures__/step8.ts'
import { STEP8_RUN2_RAW } from './__fixtures__/step8run2.ts'
import { extractDocument } from './generate.ts'
import { groundContacts, UNGROUNDED } from './ground.ts'
import { validate } from './validate.ts'

const run = (id: string, mode: 'markdown' | 'json') => STEP8_RUNS.find((r) => r.id === id && r.mode === mode)!
const card = (text: string) => parseCardMarkdown(text).data!

describe('groundContacts: выдумки шага 8 удаляются', () => {
  it('6-no-contacts, markdown: телефон из примера промпта и instagram по названию студии', () => {
    const { markdown, description } = run('6-no-contacts', 'markdown')
    expect(card(markdown)).toMatchObject({ phone: '+7 999 123-45-67', contacts: { instagram: 'lapki_nails' } })
    const { text, removed } = groundContacts(markdown, description)
    expect(removed).toEqual([UNGROUNDED, UNGROUNDED, UNGROUNDED])
    const result = card(text)
    expect(result.phone).toBeUndefined()
    expect(result.contacts ?? {}).toEqual({})
    expect(text).not.toMatch(/contacts:|primary:/)
    // Удалили все контакты — валидатор предупреждает, что связаться не с кем; адрес и город на месте
    expect(validate(text).map((d) => d.code)).toContain('no-contacts')
    expect(result).toMatchObject({ address: 'ул. Ленинградская, 40', city: 'Самара' })
  })

  it('3-nails, markdown: аватар example.com', () => {
    const { markdown, description } = run('3-nails', 'markdown')
    const { text, removed } = groundContacts(markdown, description)
    expect(removed).toEqual([UNGROUNDED])
    expect(text).not.toContain('avatar:')
    expect(card(text)).toMatchObject({ phone: '+7 912 345-67-89', contacts: { instagram: 'olga.nails.ekb', primary: 'instagram' } })
  })

  it('5-dirty, json: phone из номера, данного только для WhatsApp; whatsapp и telegram остаются', () => {
    const { markdown, description } = run('5-dirty', 'json')
    const { text, removed } = groundContacts(markdown, description)
    expect(removed).toEqual([UNGROUNDED])
    const result = card(text)
    expect(result.phone).toBeUndefined()
    expect(result.contacts).toEqual({ telegram: 'ivan_barber', whatsapp: '+7 999 123-45-67', primary: 'telegram' })
  })

  it('остальные 9 запусков: настоящие контакты из описаний не тронуты', () => {
    const changed = new Set(['6-no-contacts/markdown', '3-nails/markdown', '5-dirty/json'])
    for (const r of STEP8_RUNS.filter((r) => !changed.has(`${r.id}/${r.mode}`))) {
      expect(groundContacts(r.markdown, r.description), `${r.id}/${r.mode}`).toEqual({ text: r.markdown, removed: [] })
    }
  })
})

describe('groundContacts: что считается найденным в описании', () => {
  const doc = (head: string) => `---\nname: A\n${head}\n---\n\n## О нас\nТекст.\n`
  const kept = (head: string, description: string) => groundContacts(doc(head), description).removed.length === 0

  it('телефон — по цифрам в любой записи', () => {
    expect(kept('phone: +7 999 123-45-67', 'Звоните 8-999-123-45-67')).toBe(true)
    expect(kept('phone: +7 999 123-45-67', 'тел. 8 (999) 123 45 67')).toBe(true)
    expect(kept('phone: +7 999 123-45-67', 'номер +79991234567')).toBe(true)
    expect(kept('phone: +7 999 765-43-21', 'Звоните 8-999-123-45-67')).toBe(false)
  })

  it('phone — только номер для звонков или без указания мессенджера; whatsapp — любой номер из описания', () => {
    expect(kept('phone: +7 903 111-22-33', 'Пишите в WhatsApp +7 903 111-22-33')).toBe(false)
    expect(kept('contacts:\n  whatsapp: +7 903 111-22-33', 'Пишите в WhatsApp +7 903 111-22-33')).toBe(true)
    expect(kept('phone: +7 903 111-22-33', 'Запись в тг @anna_math или по телефону 8 903 111 22 33')).toBe(true)
    expect(kept('phone: +7 903 111-22-33', 'Анна, 8-903-111-22-33')).toBe(true)
  })

  it('имя пользователя — без @, из ссылки тоже', () => {
    expect(kept('contacts:\n  telegram: barber_ivan', 'пишите в тг @barber_ivan')).toBe(true)
    expect(kept('contacts:\n  telegram: barber_ivan', 'https://t.me/barber_ivan')).toBe(true)
    expect(kept('contacts:\n  vk: anna_math', 'страница vk.com/anna_math')).toBe(true)
    expect(kept('contacts:\n  vk: https://vk.com/anna_math', 'ВКонтакте: anna_math')).toBe(true)
    expect(kept('contacts:\n  instagram: olga.nails', 'инстаграм olga.nails.ekb')).toBe(false)
    expect(kept('contacts:\n  telegram: barber', 'пишите в тг @barber_ivan')).toBe(false)
  })

  it('почта и ссылки — по адресу; ссылка с путём — целиком, без пути — по домену', () => {
    expect(kept('contacts:\n  email: Anna@Example.ru', 'почта anna@example.ru')).toBe(true)
    expect(kept('contacts:\n  website: https://anna-math.ru/', 'мой сайт anna-math.ru')).toBe(true)
    expect(kept('contacts:\n  website: https://anna-math.ru', 'мой сайт www.anna-math.ru')).toBe(true)
    expect(kept('contacts:\n  max: https://max.ru/u/abc123', 'MAX: https://max.ru/u/abc123')).toBe(true)
    expect(kept('contacts:\n  max: https://max.ru/u/zzz', 'MAX: https://max.ru/u/abc123')).toBe(false)
    expect(kept('links:\n  - label: Отзывы\n    url: https://vk.com/topic-1', 'отзывы: vk.com/topic-1')).toBe(true)
    expect(kept('links:\n  - label: Отзывы\n    url: https://vk.com/other', 'отзывы: vk.com/topic-1')).toBe(false)
  })

  it('primary на удалённый контакт убирается, остальные контакты остаются', () => {
    const text = doc('contacts:\n  telegram: made_up_name\n  whatsapp: +7 903 111-22-33\n  primary: telegram')
    const { text: grounded, removed } = groundContacts(text, 'WhatsApp +7 903 111-22-33')
    expect(removed).toEqual([UNGROUNDED])
    expect(card(grounded).contacts).toEqual({ whatsapp: '+7 903 111-22-33' })
  })

  it('primary: phone при удалённом телефоне — contacts убираются целиком, если других контактов нет', () => {
    const text = doc('phone: +7 999 123-45-67\ncontacts:\n  primary: phone')
    const { text: grounded } = groundContacts(text, 'Студия в Самаре')
    expect(grounded).toBe(doc('').replace('name: A\n\n', 'name: A\n'))
  })

  it('часть ссылок выдумана — удаляются только они', () => {
    const text = doc('links:\n  - label: Отзывы\n    url: https://vk.com/topic-1\n  - label: Сайт\n    url: https://made-up.ru')
    const { text: grounded, removed } = groundContacts(text, 'отзывы: vk.com/topic-1')
    expect(removed).toEqual([UNGROUNDED])
    expect(card(grounded).links).toEqual([{ label: 'Отзывы', url: 'https://vk.com/topic-1' }])
  })

  it('ссылка в карточке — тоже по описанию', () => {
    const text = `${doc('phone: +7 999 123-45-67')}\n## Работы\n:::cards\ntitle: Свадьба\nurl: https://example.com/wedding\n\ntitle: Портреты\nurl: https://t.me/dmitry_photo\n:::\n`
    const { text: grounded, removed } = groundContacts(text, 'Звоните +7 999 123-45-67, портфолио t.me/dmitry_photo')
    expect(removed).toEqual([UNGROUNDED])
    expect(grounded).not.toContain('example.com')
    expect(grounded).toContain('url: https://t.me/dmitry_photo')
  })

  it('битый YAML или нет шапки — ничего не трогаем', () => {
    expect(groundContacts('---\nname: [\n---\n', 'x').removed).toEqual([])
    expect(groundContacts('## Без шапки\n', 'x').removed).toEqual([])
  })
})

describe('groundContacts: адрес и город', () => {
  const doc = (head: string) => `---\nname: A\n${head}\n---\n\n## О нас\nТекст.\n`
  const kept = (head: string, description: string) => groundContacts(doc(head), description).removed.length === 0

  it('адрес — по основам слов и числам: склонение, «ул.» и регистр не важны', () => {
    expect(kept('address: ул. Садовая, 5', 'Барбершоп на ул. Садовой, 5 в Казани')).toBe(true)
    expect(kept('address: ул. Баумана, 15', 'казань баумана 15')).toBe(true)
    expect(kept('address: ул. Мира 25, 2 этаж', 'в Тольятти, ул. Мира 25, 2 этаж')).toBe(true)
    expect(kept('address: район Химмаш', 'район химмаш екб')).toBe(true)
    expect(kept('address: Академгородок', 'у меня дома в Новосибирске (Академгородок)')).toBe(true)
  })

  it('выдуманный адрес или другой номер дома — удаляется', () => {
    expect(kept('address: ул. Ленина, 15', 'Coffee shop in Moscow, latte 250')).toBe(false)
    expect(kept('address: ул. Садовая, 7', 'на ул. Садовой, 5')).toBe(false)
    expect(kept('address: ул. Садовая, 5, центр', 'на ул. Садовой, 5')).toBe(false)
  })

  it('город — по основе, сокращению или английскому названию', () => {
    expect(kept('city: Казань', 'в Казани')).toBe(true)
    expect(kept('city: Екатеринбург', 'район химмаш екб')).toBe(true)
    expect(kept('city: Санкт-Петербург', 'Фотограф, Санкт-Петербург')).toBe(true)
    expect(kept('city: Москва', 'Coffee shop in Moscow')).toBe(true)
    expect(kept('city: Тольятти', 'Маникюр тольятти')).toBe(true)
    expect(kept('city: Москва', 'Студия маникюра в Самаре')).toBe(false)
  })

  it('primary без своего контакта убирается, даже если контакт не писала модель (m6: потерян telegram)', () => {
    const run = MANUAL_RUNS.find((r) => r.id === 'm6-no-punctuation')!
    const { text } = groundContacts(run.markdown, run.description)
    expect(text).not.toMatch(/contacts:|primary:/)
    expect(card(text)).toMatchObject({ address: 'ул. Баумана, 15', city: 'Казань' })
  })

  it('на всех настоящих ответах (шаг 8, оба прогона, ручные тесты) — только ожидаемые удаления', () => {
    const all = [
      ...STEP8_RUNS.map((r) => ({ name: `run1/${r.id}/${r.mode}`, text: r.markdown, description: r.description })),
      ...STEP8_RUN2_RAW.filter((r) => r.mode === 'markdown').map((r) => ({ name: `run2/${r.id}`, text: extractDocument(r.output, 'markdown'), description: r.description })),
      ...MANUAL_RUNS.map((r) => ({ name: `manual/${r.id}`, text: r.markdown, description: r.description })),
    ]
    const removedLines = Object.fromEntries(
      all.map((r) => {
        const after = new Set(groundContacts(r.text, r.description).text.split('\n'))
        return [r.name, r.text.split('\n').filter((line) => !after.has(line))]
      }).filter(([, lines]) => lines.length),
    )
    expect(removedLines).toEqual({
      'run1/3-nails/markdown': ['avatar: https://example.com/photo.jpg'],
      'run1/5-dirty/json': ['phone: +7 999 123-45-67'],
      'run1/6-no-contacts/markdown': ['phone: +7 999 123-45-67', 'contacts:', '  whatsapp: +7 999 123-45-67', '  instagram: lapki_nails', '  primary: whatsapp'],
      'run2/1-barbershop': ['avatar: https://barber.ru/images/barber_topor.jpg'],
      'run2/3-nails': ['avatar: https://example.com/photo.jpg'],
      'run2/4-photographer': ['avatar: https://avatars.mds.yandex.net/get-pdb/1459563/typography_lg.png'],
      'run2/6-no-contacts': ['phone: +7 900 000-00-00', 'contacts:', '  whatsapp: +7 900 000-00-00', '  primary: whatsapp'],
      'manual/m4-minimal-input': ['contacts:', '  primary: telegram'],
      'manual/m6-no-punctuation': ['contacts:', '  primary: telegram'],
    })
  })
})
