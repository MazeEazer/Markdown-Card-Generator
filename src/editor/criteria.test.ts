// Критерии приёмки этапа 4 (PLAN.md): «все правила этапа 2 видны в редакторе, автодополнение работает для всех блоков».
import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { BLOCK_NAMES, BLOCKS, type BlockDefinition } from '../dsl/schema/blocks'
import { validate } from '../dsl/validate'
import { completionsAt } from './complete'
import { fieldMeta } from './context'
import { hoverInfoAt } from './hover'
import { toEditorDiagnostics } from './lint'

const H = (extra = '') => `---\nname: Борода\nphone: +7 999 123-45-67\n${extra}---\n\n`

/** На каждый код правила — минимальный документ, где он срабатывает. */
const CORPUS: Record<string, string> = {
  'accent-format': H('accent: "#abcd"\n'),
  'accent-unquoted': H('accent: #c0392b\n'),
  'address-without-city': H('address: ул. Ленина, 1\n'),
  'contact-link': H('contacts:\n  telegram: https://t.me/boroda\n'),
  'contacts-block-empty': '---\nname: Борода\n---\n\n## Контакты\n:::contacts\n:::\n',
  'contacts-block-text': `${H()}## Контакты\n:::contacts\nзвоните\n:::\n`,
  'crlf-heading': `${H().replace(/\n/g, '\r\n')}## О нас\r\nТекст\r\n`,
  'duplicate-field': `${H()}## Цены\n:::services\ntitle: А\ntitle: Б\n:::\n`,
  'duplicate-service': `${H()}## Цены\n:::services\ntitle: Стрижка\ndescription: а\n\ntitle: Стрижка\ndescription: б\n:::\n`,
  'frontmatter-not-first': '\n---\nname: Борода\n---\n',
  'heading-no-space': `${H()}##О нас\nТекст\n`,
  'hours-close-before-open': `${H()}## Часы\n:::hours\nежедневно: 20:00–10:00\n:::\n`,
  'hours-day-missing': `${H()}## Часы\n:::hours\nпн–пт: 10:00–20:00\n:::\n`,
  'hours-day-twice': `${H()}## Часы\n:::hours\nежедневно: 10:00–20:00\nпн: 10:00–18:00\n:::\n`,
  'hours-empty': `${H()}## Часы\n:::hours\n:::\n`,
  'hours-syntax': `${H()}## Часы\n:::hours\nвсегда открыто\n:::\n`,
  'invalid-value': H('theme: dark\n'),
  'invalid-yaml': H('name: [\n'),
  'map-no-address': `${H()}## Карта\n:::map\n:::\n`,
  'max-not-link': H('contacts:\n  max: boroda\n'),
  'missing-frontmatter': '## О нас\nТекст\n',
  'missing-item-field': `${H()}## Цены\n:::services\nprice: 1500\n:::\n`,
  'missing-name': '---\ntitle: Стрижки\nphone: +7 999 123-45-67\n---\n',
  'nested-fence': `${H()}## Цены\n:::services\ntitle: А\n:::hours\n:::\n`,
  'no-contacts': '---\nname: Борода\n---\n',
  'phone-format': H().replace('+7 999 123-45-67', '+79991234567'),
  'price-not-number': `${H()}## Цены\n:::services\ntitle: А\nprice: дорого\ndescription: а\n:::\n`,
  'primary-unknown': H('contacts:\n  primary: vk\n'),
  'rating-invalid': `${H()}## Отзывы\n:::reviews\nauthor: А\ntext: Хорошо\nrating: 7\n:::\n`,
  'service-no-description': `${H()}## Цены\n:::services\ntitle: А\nprice: 1500\n:::\n`,
  'stray-text': `${H()}## Цены\n:::services\nпросто текст\n:::\n`,
  'telegram-username': H('contacts:\n  telegram: бор\n'),
  'unclosed-fence': `${H()}## Часы\n:::hours\nежедневно: 10:00–20:00\n`,
  'unclosed-frontmatter': '---\nname: Борода\nphone: +7 999 123-45-67\n',
  'unknown-block': `${H()}## А\n:::gallery\n:::\n`,
  'unknown-field': H('foo: 1\n'),
  'whatsapp-not-phone': H('contacts:\n  whatsapp: boroda\n'),
}

/** Коды из исходников правил: новое правило без примера в корпусе уронит тест. */
const RULE_SOURCES = import.meta.glob<string>(['../dsl/rules/*.ts', '!../dsl/rules/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})
const RULE_CODES = [...new Set(Object.values(RULE_SOURCES).flatMap((source) => [...source.matchAll(/code: '([a-z-]+)'/g)].map((m) => m[1])))]

describe('все правила валидатора видны в редакторе', () => {
  it('в корпусе есть пример на каждый код из правил (сейчас их 37)', () => {
    expect(Object.keys(CORPUS).sort()).toEqual(RULE_CODES.sort())
    expect(RULE_CODES).toHaveLength(37)
  })

  it.each(Object.entries(CORPUS))('%s — подчёркивание с тем же сообщением и кнопкой исправления', (code, text) => {
    const diagnostics = validate(text)
    const index = diagnostics.findIndex((d) => d.code === code)
    expect(index, `валидатор не выдал ${code}`).toBeGreaterThanOrEqual(0)

    const editor = toEditorDiagnostics(diagnostics, Text.of(text.split('\n')))
    // Линтер ничего не теряет и не переставляет
    expect(editor).toHaveLength(diagnostics.length)
    const source = diagnostics[index]
    expect(editor[index]).toMatchObject({ from: source.from, to: source.to, severity: source.severity, message: source.message })
    expect(editor[index].actions?.map((a) => a.name)).toEqual(source.fix ? [source.fix.label] : undefined)
  })
})

describe('автодополнение и справка работают для всех блоков', () => {
  const at = (textWithCursor: string) => {
    const pos = textWithCursor.indexOf('|')
    return completionsAt(textWithCursor.replace('|', ''), pos)
  }

  it.each(BLOCK_NAMES)(':::%s — в списке после ::: и по первым буквам', (name) => {
    expect(at(':::|')?.options.map((o) => o.label)).toContain(`:::${name}`)
    expect(at(`:::${name.slice(0, 2)}|`)?.options.map((o) => o.label)).toContain(`:::${name}`)
  })

  it.each(BLOCK_NAMES)(':::%s — внутри подсказываются его поля (или ничего, если полей нет)', (name) => {
    const block: BlockDefinition = BLOCKS[name]
    const result = at(`## Раздел\n:::${name}\n|\n:::`)
    if (!block.item) {
      expect(result).toBeNull()
      return
    }
    const fields = Object.entries(block.item.shape)
      .filter(([, field]) => !fieldMeta(field).deprecated)
      .map(([key]) => key)
    expect(result?.options.map((o) => o.label)).toEqual(fields)
  })

  it.each(BLOCK_NAMES)(':::%s — справка при наведении', (name) => {
    expect(hoverInfoAt(`:::${name}\n:::`, 4)?.title).toBe(`:::${name} — ${BLOCKS[name].label}`)
  })
})
