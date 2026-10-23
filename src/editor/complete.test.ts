import { describe, expect, it } from 'vitest'
import { BLOCK_NAMES } from '../dsl/schema/blocks'
import { BUSINESS_NAMES, CONTACT_NAMES, THEME_NAMES } from '../dsl/schema/frontmatter'
import { AMENITY_KEYS } from '../dsl/schema/amenities'
import { ICON_NAMES } from '../dsl/schema/icons'
import { blockSnippet, completionsAt } from './complete'

/** Текст с курсором `|` → варианты и заменяемое слово. */
function at(textWithCursor: string) {
  const pos = textWithCursor.indexOf('|')
  const text = textWithCursor.replace('|', '')
  const result = completionsAt(text, pos)
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

describe('автодополнение блоков после :::', () => {
  it('все блоки, заменяется вся строка от :::', () => {
    const result = at('## Услуги\n:::se|')
    expect(result?.labels).toEqual(BLOCK_NAMES.map((name) => `:::${name}`))
    expect(result?.word).toBe(':::se')
    expect(result?.options.find((o) => o.label === ':::services')?.detail).toBe('Услуги')
  })

  it('в первой строке документа без шапки тоже', () => {
    expect(at(':::|')?.labels).toHaveLength(BLOCK_NAMES.length)
  })

  it('внутри блока и в шапке — нет: там ::: закрывает блок', () => {
    expect(at(':::services\ntitle: А\n:::|')).toBeNull()
    expect(at('---\n:::|\n---')).toBeNull()
  })
})

describe('заготовки блоков', () => {
  it('первый элемент примера, значения — поля для Tab по порядку', () => {
    expect(blockSnippet('services')).toBe(
      ':::services\ntitle: ${1:Мужская стрижка}\nprice: ${2:1500}\nduration: ${3:60 мин}\ndescription: ${4:Машинкой и ножницами, мытьё головы и укладка}\n:::${0}',
    )
  })

  it('атрибут строки открытия — тоже поле', () => {
    expect(blockSnippet('code')).toBe(':::code lang="${1:js}"\n${2:console.log(\'Привет!\')}\n:::${0}')
  })

  it('строки часов: дни остаются, время — поле', () => {
    expect(blockSnippet('hours').split('\n')[1]).toBe('пн–пт: ${1:10:00–20:00}')
  })

  it('блок без содержимого — только открытие и закрытие', () => {
    expect(blockSnippet('contacts')).toBe(':::contacts\n:::${0}')
  })

  it('каждая заготовка после вставки разбирается парсером в свой блок без ошибок', async () => {
    const { validate } = await import('../dsl/validate')
    const { parseDocument } = await import('../dsl/parser')
    for (const name of BLOCK_NAMES) {
      const text = '---\nname: Тест\nphone: +7 999 123-45-67\naddress: ул. Ленина, 1\ncity: Самара\n---\n\n## Раздел\n' +
        blockSnippet(name).replace(/\$\{\d+(?::([^}]*))?\}/g, '$1') + '\n'
      const blocks = parseDocument(text).sections.flatMap((section) => section.blocks)
      expect(blocks.map((block) => block.name), name).toEqual([name])
      expect(validate(text).filter((d) => d.severity === 'error'), name).toEqual([])
    }
  })
})

describe('автодополнение полей', () => {
  it('в шапке — незаполненные поля, без устаревших', () => {
    const result = at('---\nname: Борода\nph|\n---')
    expect(result?.word).toBe('ph')
    expect(result?.labels).not.toContain('name')
    expect(result?.labels).not.toContain('location')
    expect(result?.labels).toContain('phone')
    expect(result?.options.find((o) => o.label === 'phone')?.apply).toBe('phone: ')
  })

  it('contacts: сразу открывает строку с отступом', () => {
    expect(at('---\nname: Борода\n|\n---')?.options.find((o) => o.label === 'contacts')?.apply).toBe('contacts:\n  ')
  })

  it('в блоке — поля элемента, кроме уже заполненных в этом элементе', () => {
    const result = at(':::services\ntitle: Стрижка\nprice: 1500\n\ntitle: Борода\n|\n:::')
    expect(result?.labels).toEqual(['price', 'duration', 'description'])
    expect(result?.options[0].info).toMatch(/^Цена числом/)
  })

  it('обязательное поле помечено', () => {
    const result = at(':::reviews\n|\n:::')
    expect(result?.options.filter((o) => o.detail === 'обязательное').map((o) => o.label)).toEqual(['text'])
  })

  it('в блоках без полей (hours, code, contacts) и вне блоков — нет', () => {
    expect(at(':::hours\np|\n:::')).toBeNull()
    expect(at(':::code\nco|\n:::')).toBeNull()
    expect(at('## О нас\nNo|')).toBeNull()
  })
})

describe('автодополнение удобств', () => {
  it('key: в блоке amenities — все удобства с названиями', () => {
    const result = at('---\nname: A\n---\n\n## Удобства\n:::amenities\nkey: |\n:::')
    expect(result?.labels).toEqual(AMENITY_KEYS)
    expect(result?.options.find((o) => o.label === 'wifi')?.detail).toBe('Wi-Fi')
  })

  it('начатое слово заменяется', () => {
    expect(at('---\nname: A\n---\n\n## Удобства\n:::amenities\nkey: par|\n:::')?.word).toBe('par')
  })

  it('поля элемента: key и text; блок есть в списке «:::»', () => {
    const fields = at('---\nname: A\n---\n\n## Удобства\n:::amenities\n|\n:::')
    expect(fields?.labels).toEqual(['key', 'text'])
    expect(at('---\nname: A\n---\n\n## X\n:::|')?.labels).toContain(':::amenities')
  })

  it('«+ Блок»: заготовка с key', () => {
    expect(blockSnippet('amenities')).toContain('key: ')
  })
})
