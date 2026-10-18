import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { THEME_NAMES } from '../../dsl/schema/frontmatter'
import { validate } from '../../dsl/validate'
import { parseCardMarkdown } from '../../lib/parser'
import { localBusiness } from '../../lib/structuredData'
import { resolveTheme } from '../../lib/themeEngine'
import { Site } from '../../themes/Site'
import { DEFAULT_TEMPLATE, templateMarkdown, TEMPLATES } from './index'

describe.each(TEMPLATES.map((template) => [template.label, template] as const))('шаблон «%s»', (_, template) => {
  it('проходит валидатор без замечаний', () => {
    // Пустому сайту валидатор честно напоминает добавить контакты — это единственное замечание
    const expected = template.id === 'empty' ? ['no-contacts'] : []
    expect(validate(template.markdown).map((d) => d.code)).toEqual(expected)
  })

  it.each(THEME_NAMES)('рендерится в теме %s', (theme) => {
    const data = parseCardMarkdown(template.markdown).data!
    const html = renderToStaticMarkup(<Site data={data} resolved={resolveTheme(data, theme)} />)
    expect(html).toContain(data.name.replace('«', '«'))
    for (const section of data.sections) expect(html).toContain(section.title)
  })

  it('вид бизнеса в шапке совпадает с шаблоном', () => {
    const data = parseCardMarkdown(template.markdown).data!
    expect(data.business ?? 'empty').toBe(template.id)
  })
})

describe('шаблоны бизнеса', () => {
  it.each(TEMPLATES.filter((t) => t.id !== 'empty').map((t) => [t.label, t] as const))('«%s» — разметка Schema.org', (_, template) => {
    const ld = localBusiness(parseCardMarkdown(template.markdown).data!)!
    expect(ld.telephone).toBe('+79000000000')
    expect(ld.hasOfferCatalog).toBeDefined()
    expect(ld.openingHoursSpecification).toBeDefined()
  })

  it('шаблон по умолчанию — барбершоп', () => {
    expect(DEFAULT_TEMPLATE).toBe(TEMPLATES[0].markdown)
  })
})

describe('templateMarkdown', () => {
  it.each(['Студия «Ноготок»', 'Стрижки: мужские', '#1 в городе', 'Анна'])('название %j подставляется и не ломает шапку', (name) => {
    const markdown = templateMarkdown('nails', name)
    expect(parseCardMarkdown(markdown).data!.name).toBe(name)
    expect(validate(markdown)).toEqual([])
  })

  it('пустое название — шаблон как есть', () => {
    expect(templateMarkdown('tutor', '  ')).toBe(TEMPLATES.find((t) => t.id === 'tutor')!.markdown)
  })
})
