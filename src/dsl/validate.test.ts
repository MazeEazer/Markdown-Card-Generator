import { describe, expect, it } from 'vitest'
import { defaultTemplate } from '../data/defaultTemplate.ts'
import { offsetToLineCol } from './position.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { FRONTMATTER_EXAMPLE } from './schema/frontmatter.ts'
import { validate } from './validate.ts'

describe('validate', () => {
  it('шаблон по умолчанию — без замечаний', () => {
    expect(validate(defaultTemplate)).toEqual([])
  })

  it('пример из схемы со всеми блоками — без замечаний', () => {
    const text = `${FRONTMATTER_EXAMPLE}\n${BLOCK_NAMES.map((name) => `## ${BLOCKS[name].label}\n${BLOCKS[name].example}`).join('\n\n')}\n`
    expect(validate(text)).toEqual([])
  })

  it('диагностики отсортированы по позиции и знают строку', () => {
    const text = '---\nname: A\nphone: +7 999 123-45-67\ntheme: neon\n---\n:::prices\n:::\n##Цены'
    const found = validate(text)
    expect(found.map((d) => d.code)).toEqual(['invalid-value', 'unknown-block', 'heading-no-space'])
    expect(found.map((d) => offsetToLineCol(text, d.from).line)).toEqual([4, 6, 8])
  })

  it('на случайных документах позиции диагностик и исправлений — внутри текста', () => {
    // Поля шапки: корректный YAML, ломающие YAML строки и поля внутри contacts
    const headLines = [
      'name: Тест', 'name: Тест', 'theme: noire', 'accent: #abc', 'accent: abc', 'accent: red', 'phone: 8-999-123-45-67',
      'address: ул. Ленина, 1', 'phon: 1', 'links: x',
    ]
    const brokenLines = ['title: Стрижки: мужские', '\tcity: x', '  telegram: @ivan']
    const contactLines = ['  telegram: https://t.me/ivan', '  telegram: ivan', '  whatsapp: ivan', '  tg: x', '  primary: vk']
    const bodyLines = [
      '## О себе', '##Цены', '##', '', ':::cards', ':::card', ':::accordion', ':::code', ':::', 'title: A', 'titel: B',
      'title: C', 'Note: n', 'текст', 'icon: rocet', 'url: t.me/x', '| a | b |',
    ]
    let seed = 5
    // Старшие биты: у линейного конгруэнтного генератора младшие повторяются с коротким периодом
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return (seed >>> 16) % n
    }
    const pick = (lines: string[], max: number) => Array.from({ length: random(max) }, () => lines[random(lines.length)])
    // Поля шапки — каждый ключ не больше одного раза: повтор поля — ошибка YAML, и правила шапки молчат
    const pickFields = (lines: string[], max: number) => {
      const keys = new Set<string>()
      return pick(lines, max).filter((line) => {
        const key = line.trim().split(':')[0]
        if (keys.has(key)) return false
        keys.add(key)
        return true
      })
    }
    const codes = new Set<string>()
    for (let i = 0; i < 3000; i++) {
      const sep = random(6) === 0 ? '\r\n' : '\n'
      const fields = [
        ...pickFields(headLines, 6),
        ...(random(3) === 0 ? pick(brokenLines, 2) : []),
        ...(random(2) ? ['contacts:', ...pickFields(contactLines, 5)] : []),
      ]
      const head = random(5) === 0 ? [] : ['---', ...fields, ...(random(10) ? ['---'] : [])]
      const text = [...head, ...pick(bodyLines, 12)].join(sep)
      for (const d of validate(text)) {
        codes.add(d.code)
        expect(0 <= d.from && d.from <= d.to && d.to <= text.length, `${d.code} в ${JSON.stringify(text)}`).toBe(true)
        expect(d.message.length).toBeGreaterThan(0)
        if (d.fix) {
          const from = d.fix.from ?? d.from
          const to = d.fix.to ?? d.to
          expect(0 <= from && from <= to && to <= text.length, `fix ${d.code}`).toBe(true)
        }
      }
    }
    // Случайные документы задевают почти все правила (сейчас — все 23)
    expect(codes.size).toBeGreaterThanOrEqual(21)
  })

  it('у каждой диагностики сообщение по-русски', () => {
    const text = '---\nname: A\ntheme: neon\naccent: #abc\nphon: 1\n---\n:::cards\nтекст\nicon: x\n'
    const found = validate(text)
    expect(found.length).toBeGreaterThan(3)
    for (const d of found) expect(d.message).toMatch(/[а-яё]/i)
  })
})
