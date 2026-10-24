import { describe, expect, it } from 'vitest'
import { templateMarkdown, TEMPLATES } from '../data/templates/index.ts'
import { addMissingMap, applyAllFixes, MAP_ADDED } from './fix.ts'
import { validate } from './validate.ts'

/** Исправимые замечания, которые остались в тексте. */
const fixable = (text: string) => validate(text).filter((d) => d.fix && !d.fix.guess)

// Так пишет нейросеть или человек «как привык»: телефон с восьмёркой, ссылка вместо имени,
// цвет без кавычек, «1500р», заголовок без пробела, незакрытый блок
const DIRTY = `---
name: Борода
accent: #c0392b
phone: 8-999-123-45-67
contacts:
  telegram: https://t.me/barber_ivan
  whatsapp: 89991234567
  primary: tg
---
##Цены
:::services
title: Стрижка
price: 1500р

:::hours
пн–пт: 10:00–20:00
:::
`

describe('applyAllFixes', () => {
  it.each(TEMPLATES.map((t) => t.id))('шаблон %s не меняется', (id) => {
    const text = templateMarkdown(id, 'Тест')
    expect(applyAllFixes(text)).toEqual({ text, applied: [] })
  })

  it('исправляет всё исправимое в «грязном» документе', () => {
    const { text, applied } = applyAllFixes(DIRTY)
    expect(fixable(text)).toEqual([])
    expect(validate(text).filter((d) => d.severity === 'error')).toEqual([])
    expect(text).toContain('accent: "#c0392b"')
    expect(text).toContain('phone: +7 999 123-45-67')
    expect(text).toContain('telegram: barber_ivan')
    expect(text).toContain('whatsapp: +7 999 123-45-67')
    expect(text).toContain('primary: telegram')
    expect(text).toContain('## Цены')
    expect(text).toContain('price: 1500\n\n:::\n:::hours')
    expect(applied.map((d) => d.code)).toEqual(
      expect.arrayContaining(['accent-unquoted', 'phone-format', 'contact-link', 'heading-no-space', 'price-not-number', 'nested-fence']),
    )
  })

  it('повторный запуск ничего не меняет', () => {
    const once = applyAllFixes(DIRTY).text
    expect(applyAllFixes(once)).toEqual({ text: once, applied: [] })
  })

  it('пропускает коды из skip — например, заглушку вместо названия', () => {
    const text = '---\ntitle: Стрижки\n---\n'
    expect(applyAllFixes(text).text).toContain('name: Моё название')
    const skipped = applyAllFixes(text, { skip: new Set(['missing-name']) })
    expect(skipped).toEqual({ text, applied: [] })
  })

  it('догадки не применяет без guesses: true', () => {
    // «master: Иван» — выдуманное поле; склеить его с ценой — значит испортить цену
    const text = '---\nname: A\nphone: +7 999 123-45-67\n---\n:::services\ntitle: Стрижка\nprice: 1500\nmaster: Иван\ntitle: Борода\n:::\n'
    expect(applyAllFixes(text)).toEqual({ text, applied: [] })
    const guessed = applyAllFixes(text, { guesses: true })
    expect(guessed.text).toContain('price: 1500 master: Иван')
    expect(guessed.applied.map((d) => d.code)).toEqual(['unknown-field', 'duplicate-field'])
  })

  it('пересекающиеся правки применяются в следующих проходах', () => {
    // Исправление переводов строк заменяет весь текст и пересекается с исправлением телефона
    const text = '---\r\nname: A\r\nphone: 89991234567\r\n---\r\n##Цены\r\n'
    const { text: fixed, applied } = applyAllFixes(text)
    expect(fixed).toBe('---\nname: A\nphone: +7 999 123-45-67\n---\n## Цены\n')
    expect(new Set(applied.map((d) => d.code))).toEqual(new Set(['crlf-heading', 'phone-format', 'heading-no-space']))
  })

  it('останавливается на пределе проходов', () => {
    const { applied } = applyAllFixes(DIRTY, { maxRounds: 1 })
    expect(applied.length).toBeGreaterThan(0)
    expect(applyAllFixes(DIRTY, { maxRounds: 0 })).toEqual({ text: DIRTY, applied: [] })
  })

  it('на случайных документах завершается, исправимого не прибавляется', () => {
    const lines = [
      '---', 'name: Тест', 'phone: 8-999-123-45-67', 'accent: #abc', 'theme: noire', 'phon: 1', 'contacts:',
      '  telegram: @ivan', '  tg: x', '  primary: vk', '##Цены', ':::services', ':::card', ':::', 'title: A',
      'titel: B', 'price: 1500р', 'текст', '', '\tcity: x',
    ]
    let seed = 7
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return (seed >>> 16) % n
    }
    for (let i = 0; i < 1000; i++) {
      const sep = random(5) === 0 ? '\r\n' : '\n'
      const text = Array.from({ length: random(15) }, () => lines[random(lines.length)]).join(sep)
      const { text: fixed } = applyAllFixes(text)
      expect(fixable(fixed).length, JSON.stringify(text)).toBeLessThanOrEqual(fixable(text).length)
    }
  })
})

describe('addMissingMap', () => {
  const HEAD = '---\nname: Аптека\nphone: +7 846 123-45-67\naddress: ул. Ленина, 10\ncity: Самара\n---\n\n'
  const CONTACTS = '## Контакты\n:::contacts\n:::\n'

  it.each(TEMPLATES.map((t) => t.id))('шаблон %s не меняется', (id) => {
    const text = templateMarkdown(id, 'Тест')
    expect(addMissingMap(text)).toEqual({ text, added: [] })
  })

  it('адрес есть, карты нет — раздел добавляется перед «Контактами»', () => {
    const text = `${HEAD}## Адреса\n- ул. Ленина, 10\n- ул. Мира, 5\n\n${CONTACTS}`
    const result = addMissingMap(text)
    expect(result.added).toEqual([MAP_ADDED])
    expect(result.text).toBe(`${HEAD}## Адреса\n- ул. Ленина, 10\n- ул. Мира, 5\n\n## Как добраться\n:::map\n:::\n\n${CONTACTS}`)
    // результат проходит проверку: карта с адресом — без замечаний
    expect(validate(result.text).filter((d) => d.code === 'map-no-address')).toEqual([])
  })

  it('«Контактов» нет — раздел добавляется в конец', () => {
    expect(addMissingMap(`${HEAD}## О нас\nТекст.`).text).toBe(`${HEAD}## О нас\nТекст.\n\n## Как добраться\n:::map\n:::\n`)
  })

  it('«Контакты» без блока, только заголовок — тоже перед ними', () => {
    const result = addMissingMap(`${HEAD}## Контакты\nЗвоните.\n`)
    expect(result.text).toBe(`${HEAD}## Как добраться\n:::map\n:::\n\n## Контакты\nЗвоните.\n`)
  })

  it('адреса нет — не добавляется', () => {
    const text = '---\nname: Репетитор\ncity: Самара\n---\n\n## О себе\nУчу онлайн.\n'
    expect(addMissingMap(text)).toEqual({ text, added: [] })
  })

  it('карта уже есть — не дублируется', () => {
    const text = `${HEAD}## Где мы\n:::map\n:::\n\n${CONTACTS}`
    expect(addMissingMap(text)).toEqual({ text, added: [] })
    // и повторный вызов ничего не меняет
    const once = addMissingMap(`${HEAD}${CONTACTS}`).text
    expect(addMissingMap(once)).toEqual({ text: once, added: [] })
  })
})
