import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { MANUAL_RUNS } from './__fixtures__/manual.ts'
import { STEP8_RUNS } from './__fixtures__/step8.ts'
import { STEP8_RUN3_RAW } from './__fixtures__/step8run3.ts'
import { extractDocument, processResponse } from './generate.ts'
import { EMPTY_FIELD, isPlaceholder, isWholePlaceholder, PLACEHOLDER_MARKER, PLACEHOLDER_STRIPPED, PLACEHOLDER_VALUE, removePlaceholders, withoutMarker } from './placeholders.ts'
import { EXAMPLE_DOCUMENT, EXAMPLE_JSON, promptExample } from './prompt.ts'
import { unwrap } from './rules/helpers.ts'
import { BLOCK_NAMES, BLOCKS } from './schema/blocks.ts'
import { frontmatterSchema } from './schema/frontmatter.ts'

const manual = (id: string) => MANUAL_RUNS.find((r) => r.id === id)!

describe('removePlaceholders: заглушки из примеров промпта', () => {
  it('маркер — одна константа, по ней строятся все заглушки промпта', () => {
    expect(PLACEHOLDER_MARKER).toBe('из описания')
    expect(isPlaceholder('Маникюр — из описания')).toBe(true)
    expect(isPlaceholder('Из описания')).toBe(true)
    expect(isPlaceholder('Маникюр с покрытием')).toBe(false)
  })

  it('m4 (Lightning, «Маникюр тольятти»): заглушки, которых нет в описании, удалены; «Маникюр — из описания» → «Маникюр»', () => {
    const run = manual('m4-minimal-input')
    const { text, removed } = removePlaceholders(run.markdown, run.description)
    expect(text).not.toContain(PLACEHOLDER_MARKER)
    expect(text).toContain('title: Маникюр\nprice: 1500')
    // «Педикюр», «Как записаться?», «срочный маникюр» — в описании нет: элементы удалены вместе с выдуманными ответами
    expect(text).not.toMatch(/Педикюр|Как записаться|Срочный маникюр/)
    expect(removed.filter((c) => c === PLACEHOLDER_STRIPPED)).toHaveLength(1)
    expect(removed.filter((c) => c === PLACEHOLDER_VALUE)).toHaveLength(3)
  })

  it('7-nails-floor (Lightning, третий прогон): маркер у настоящих услуг отрезается — услуги и цены остаются', () => {
    const run = STEP8_RUN3_RAW.find((r) => r.model === 'GigaChat-3-Lightning' && r.id === '7-nails-floor' && r.mode === 'markdown')!
    const { text } = removePlaceholders(extractDocument(run.output, 'markdown'), run.description)
    expect(text).toContain('title: Маникюр с покрытием\nprice: 1800')
    expect(text).toContain('title: Снятие\nprice: 300')
    expect(text).not.toContain(PLACEHOLDER_MARKER)
  })

  it('заглушка целиком или настоящее значение с маркером', () => {
    const inDescription = (description: string) => (value: string) => isWholePlaceholder(value, (w) => description.toLowerCase().includes(w.slice(0, 4)))
    const nails = inDescription('Маникюр с покрытием 1800, педикюр 2200')
    expect(nails('Вопрос 1 — из описания')).toBe(true)
    expect(nails('Из описания')).toBe(true)
    expect(nails('улица и дом — из описания')).toBe(true)
    expect(nails('Ответ на вопрос 1 — из описания')).toBe(true)
    expect(nails('Часто задаваемые вопросы — из описания')).toBe(true)
    expect(nails('Маникюр с покрытием — из описания')).toBe(false)
    expect(withoutMarker('Маникюр с покрытием — из описания')).toBe('Маникюр с покрытием')
    expect(withoutMarker('Педикюр (из описания)')).toBe('Педикюр')
  })

  it('значение из одного тире — пустое: «duration: —» удаляется', () => {
    const text = '---\nname: A\n---\n\n## Услуги\n:::services\ntitle: Дизайн\nprice: от 100\nduration: —\n:::\n'
    expect(removePlaceholders(text, 'дизайн от 100')).toEqual({ text: text.replace('duration: —\n', ''), removed: [EMPTY_FIELD] })
  })

  it('m5 (Lightning, автосервис): «Часто задаваемые вопросы — из описания» удалены, настоящие услуги остались', () => {
    const { text } = removePlaceholders(manual('m5-car-service').markdown, manual('m5-car-service').description)
    expect(text).not.toMatch(/из описания/i)
    expect(text).toContain('title: Замена масла\nprice: 800')
    expect(text).toContain('title: Шиномонтаж\nprice: от 1500')
  })

  it('m6: «description: Из описания» — удаляется только поле, услуга остаётся', () => {
    const { text, removed } = removePlaceholders(manual('m6-no-punctuation').markdown, manual('m6-no-punctuation').description)
    expect(removed).toEqual([PLACEHOLDER_VALUE])
    expect(text).toContain('title: Мужская стрижка\nprice: 1500\n\ntitle: Борода')
  })

  it('пустое поле «phone:» (кофейня) — удаляется, как null в режиме json', () => {
    const text = '---\nname: Coffee shop\nphone:\ncontacts:\n  telegram: coffee_msk\n---\n\n## О нас\nКофе.\n'
    expect(removePlaceholders(text, 'Coffee shop')).toEqual({ text: '---\nname: Coffee shop\ncontacts:\n  telegram: coffee_msk\n---\n\n## О нас\nКофе.\n', removed: [EMPTY_FIELD] })
  })

  it('раздел, где был только текст-заглушка, — удаляется с заголовком; с настоящим текстом — только строка', () => {
    const only = '---\nname: A\n---\n\n## О нас\nТекст о бизнесе — из описания\n\n## Цены\nСтрижка 1500.\n'
    expect(removePlaceholders(only, 'Стрижка').text).toBe('---\nname: A\n---\n\n## Цены\nСтрижка 1500.\n')
    const mixed = '---\nname: A\n---\n\n## О нас\nСтрижём с утра.\nТекст о бизнесе — из описания\n'
    expect(removePlaceholders(mixed, 'Стрижём').text).toBe('---\nname: A\n---\n\n## О нас\nСтрижём с утра.\n')
  })

  it('m7 (кофейня): пустое «phone:» в настоящем ответе — удаляется только оно', () => {
    const { text, removed } = removePlaceholders(manual('m7-english').markdown, manual('m7-english').description)
    expect(removed).toEqual([EMPTY_FIELD])
    expect(text).not.toMatch(/^phone:/m)
    expect(text).toContain('telegram: coffee_msk')
  })

  it('настоящие ответы без заглушек и пустых полей не меняются', () => {
    for (const run of [...STEP8_RUNS, ...MANUAL_RUNS.filter((r) => !['m4-minimal-input', 'm5-car-service', 'm6-no-punctuation', 'm7-english'].includes(r.id))]) {
      expect(removePlaceholders(run.markdown, run.description).removed, run.id).toEqual([])
    }
  })
})

/** Все заглушки, которые нейросеть видит в промпте: promptExample полей и условные значения примеров блоков. */
function promptPlaceholders(): string[] {
  const values: string[] = []
  const visit = (schema: z.ZodType) => {
    const inner = unwrap(schema)
    const meta = inner.meta() as { promptExample?: string } | undefined
    if (meta?.promptExample) values.push(meta.promptExample)
    if (inner instanceof z.ZodObject) Object.values(inner.shape as Record<string, z.ZodType>).forEach(visit)
    if (inner instanceof z.ZodArray) visit(inner.element as z.ZodType)
  }
  visit(frontmatterSchema)
  for (const name of BLOCK_NAMES) {
    if (BLOCKS[name].item) visit(BLOCKS[name].item!)
    for (const line of promptExample(BLOCKS[name]).split('\n')) if (isPlaceholder(line)) values.push(line.replace(/^\w+: /, ''))
  }
  return [...new Set(values)]
}

describe('ни одна заглушка промпта не доходит до сайта', () => {
  const placeholders = promptPlaceholders()

  it('заглушек много — проверка не пустая', () => {
    expect(placeholders).toEqual(expect.arrayContaining(['+7 900 000-00-00', 'vash_telegram', 'улица и дом — из описания', 'Вопрос 1 — из описания']))
    expect(placeholders.length).toBeGreaterThan(15)
  })

  // Худший случай: модель переписала пример из промпта целиком, а в описании ничего этого нет
  const blocksDocument = `---\nname: Тест\n---\n\n${BLOCK_NAMES.map((name) => `## ${BLOCKS[name].label}\n${promptExample(BLOCKS[name])}`).join('\n\n')}\n`
  it.each([
    ['пример документа', EXAMPLE_DOCUMENT, 'markdown'],
    ['примеры всех блоков', blocksDocument, 'markdown'],
    ['пример JSON', JSON.stringify(EXAMPLE_JSON), 'json'],
  ] as const)('%s', (_name, output, mode) => {
    const { autofix } = processResponse(output, mode, 'Барбершоп в Самаре')
    for (const value of placeholders) expect(autofix!.output, value).not.toContain(value)
    expect(autofix!.output).not.toContain(PLACEHOLDER_MARKER)
  })
})
