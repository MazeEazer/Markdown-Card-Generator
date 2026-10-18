import { describe, expect, it } from 'vitest'
import { hoverInfoAt } from './hover'

/** Текст с курсором `|` → справка и слово под ней. */
function at(textWithCursor: string) {
  const pos = textWithCursor.indexOf('|')
  const text = textWithCursor.replace('|', '')
  const info = hoverInfoAt(text, pos)
  return info && { ...info, word: text.slice(info.from, info.to) }
}

describe('справка по блоку', () => {
  it('над именем блока: название, описание и поля элемента', () => {
    const info = at('## Услуги\n:::serv|ices\n:::')
    expect(info?.word).toBe(':::services')
    expect(info?.title).toBe(':::services — Услуги')
    expect(info?.lines[0]).toMatch(/^Услуги с ценами/)
    expect(info?.fields?.map((f) => [f.key, f.required])).toEqual([
      ['title', true],
      ['price', false],
      ['duration', false],
      ['description', false],
    ])
  })

  it('над ::: тоже справка по блоку', () => {
    expect(at('|:::hours\n:::')?.title).toBe(':::hours — Часы работы')
  })

  it('блок без полей: вместо полей — что писать внутри', () => {
    const info = at(':::ho|urs\n:::')
    expect(info?.fields).toBeUndefined()
    expect(info?.lines[1]).toMatch(/^По строке на дни/)
  })

  it('устаревшие поля в списке не показываются', () => {
    expect(at(':::ca|rds\n:::')?.fields?.map((f) => f.key)).not.toContain('link')
  })

  it('неизвестный блок, атрибуты и закрывающее ::: — без справки', () => {
    expect(at(':::unkn|own\n:::')).toBeNull()
    expect(at(':::code lang="j|s"\n:::')).toBeNull()
    expect(at(':::map\n:|::')).toBeNull()
  })
})

describe('справка по полю', () => {
  it('поле шапки: обязательность, описание, пример', () => {
    const info = at('---\nph|one: +7 999 123-45-67\n---')
    expect(info?.word).toBe('phone')
    expect(info?.title).toBe('phone — необязательное поле')
    expect(info?.lines).toEqual(['Телефон для звонков', 'Пример: +7 999 123-45-67'])
    expect(at('---\nna|me: Борода\n---')?.title).toBe('name — обязательное поле')
  })

  it('перечисление: значения — если их нет в описании', () => {
    expect(at('---\ncontacts:\n  prim|ary: vk\n---')?.lines).toContain(
      'Значения: telegram, whatsapp, vk, max, instagram, email, website, phone',
    )
    expect(at('---\ncurr|ency: RUB\n---')?.lines.join(' ')).not.toContain('Значения:')
    expect(at('---\nthe|me: noir\n---')?.lines.join(' ')).not.toContain('Значения:')
  })

  it('русский синоним ключа', () => {
    expect(at('---\nтел|ефон: +7 999 123-45-67\n---')?.title).toBe('телефон — необязательное поле')
  })

  it('внутри contacts: и в элементе links:', () => {
    expect(at('---\ncontacts:\n  tele|gram: boroda\n---')?.lines[0]).toMatch(/^имя пользователя в Telegram/)
    expect(at('---\ncontacts:\n  telegram: boroda\n  prim|ary: telegram\n---')?.lines[0]).toMatch(/^Куда ведёт главная кнопка/)
    expect(at('---\nlinks:\n  - lab|el: Сайт\n    url: https://a.ru\n---')?.word).toBe('label')
  })

  it('устаревшее поле помечено', () => {
    expect(at('---\nloca|tion: Самара\n---')?.lines).toContain('Устаревшее поле — лучше не использовать.')
  })

  it('поле элемента блока', () => {
    const info = at(':::services\ntitle: Стрижка\npri|ce: 1500\n:::')
    expect(info?.title).toBe('price — необязательное поле')
    expect(info?.lines[0]).toMatch(/^Цена числом/)
  })

  it('над значением, неизвестным полем и вне блока — без справки', () => {
    expect(at('---\nphone: +7 9|99\n---')).toBeNull()
    expect(at('---\nfo|o: 1\n---')).toBeNull()
    expect(at(':::services\nfo|o: 1\n:::')).toBeNull()
    expect(at('## О нас\nNo|te: текст')).toBeNull()
    expect(at(':::hours\nп|н–пт: 10:00–20:00\n:::')).toBeNull()
  })
})
