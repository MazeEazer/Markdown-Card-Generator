import { describe, expect, it } from 'vitest'
import { BUSINESS_NAMES, CONTACT_NAMES, THEME_NAMES } from '../dsl/schema/frontmatter'
import { ICON_NAMES } from '../dsl/schema/icons'
import { valueCompletions } from './complete'

/** Текст с курсором `|` → варианты и заменяемое слово. */
function at(textWithCursor: string) {
  const pos = textWithCursor.indexOf('|')
  const text = textWithCursor.replace('|', '')
  const result = valueCompletions(text, pos)
  if (!result) return null
  return { word: text.slice(result.from, pos), labels: result.options.map((o) => o.label), options: result.options }
}

describe('автодополнение значений', () => {
  it('theme: — все темы и auto, с пояснениями', () => {
    const result = at('---\nname: Борода\ntheme: |\n---')
    expect(result?.labels).toEqual([...THEME_NAMES, 'auto'])
    expect(result?.options.find((o) => o.label === 'noir')?.detail).toBe('тёмная, контрастная')
  })

  it('заменяется начатое слово', () => {
    expect(at('---\ntheme: no|\n---')?.word).toBe('no')
  })

  it('business: и currency:', () => {
    expect(at('---\nbusiness: |\n---')?.labels).toEqual(BUSINESS_NAMES)
    expect(at('---\ncurrency: |\n---')?.labels).toEqual(['RUB'])
  })

  it('русский синоним ключа: «тема:» = theme', () => {
    expect(at('---\nтема: |\n---')?.labels).toEqual([...THEME_NAMES, 'auto'])
  })

  it('вне шапки theme: не подсказывается', () => {
    expect(at('---\nname: Борода\n---\n\ntheme: |')).toBeNull()
    expect(at(':::services\ntheme: |\n:::')).toBeNull()
  })

  it('icon: в :::cards и в ссылках шапки; в других блоках — нет', () => {
    expect(at(':::cards\ntitle: Стрижка\nicon: |\n:::')?.labels).toEqual(ICON_NAMES)
    expect(at('---\nlinks:\n  - label: Сайт\n    icon: gl|\n---')?.labels).toEqual(ICON_NAMES)
    expect(at(':::services\nicon: |\n:::')).toBeNull()
  })

  it('после закрытия блока icon: уже не в :::cards', () => {
    expect(at(':::cards\ntitle: А\n:::\n\nicon: |')).toBeNull()
  })

  it('внутри contacts: — способы связи, кроме уже указанных; вставляется «ключ: »', () => {
    const result = at('---\nname: Борода\ncontacts:\n  telegram: borodа\n  |\n---')
    expect(result?.labels).toEqual([...CONTACT_NAMES.filter((name) => name !== 'telegram'), 'primary'])
    expect(result?.options[0].apply).toBe('whatsapp: ')
  })

  it('contacts: по-русски — «контакты:»', () => {
    expect(at('---\nконтакты:\n  wh|\n---')?.word).toBe('wh')
  })

  it('строка с отступом не под contacts: — без подсказок', () => {
    expect(at('---\nlinks:\n  |\n---')).toBeNull()
  })

  it('primary: — сначала указанные контакты и телефон', () => {
    const result = at('---\ncontacts:\n  whatsapp: +7 999 123-45-67\n  primary: |\n  vk: barber\n---')
    expect(result?.labels.slice(0, 3)).toEqual(['whatsapp', 'vk', 'phone'])
    expect(result?.options.find((o) => o.label === 'telegram')?.detail).toBe('не указан')
  })

  it('primary: на верхнем уровне шапки — не поле contacts', () => {
    expect(at('---\nprimary: |\n---')).toBeNull()
  })

  it('неизвестный ключ и обычный текст — без подсказок', () => {
    expect(at('---\nname: |\n---')).toBeNull()
    expect(at('## О нас\nПросто текст|')).toBeNull()
  })
})
