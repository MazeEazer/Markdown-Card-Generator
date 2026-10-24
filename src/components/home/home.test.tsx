// Разметка первого экрана и кнопок создания (renderToStaticMarkup — как в тестах тем, без браузера).
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CREATE_AI, CREATE_TEMPLATE, HERO_SUBTITLE, HERO_TITLE } from './copy'
import { CreateButtons } from './CreateButtons'
import { Hero } from './Hero'
import { PREVIEW_CARD } from './previewCard'
import { TemplateForm } from './TemplateForm'

const noop = () => {}
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ')

describe('кнопки создания', () => {
  const html = renderToStaticMarkup(<CreateButtons onAi={noop} onTemplate={noop} />)

  it('главная — «✦ Создать сайт с ИИ» с меткой «ИИ» и подписью, чёрная', () => {
    expect(text(html)).toContain(`${CREATE_AI.label} ИИ ${CREATE_AI.hint}`)
    expect(CREATE_AI.hint).toBe('Опишите бизнес своими словами — нейросеть соберёт сайт')
    expect(html.indexOf('ui-btn-primary')).toBeLessThan(html.indexOf('ui-btn-secondary'))
  })

  it('вторая — «Из готового шаблона» с подписью, белая с рамкой', () => {
    expect(text(html)).toContain(`${CREATE_TEMPLATE.label} ${CREATE_TEMPLATE.hint}`)
    expect(CREATE_TEMPLATE.hint).toBe('Барбершоп, репетитор, маникюр, фотограф — без ИИ, заполните сами')
  })
})

describe('первый экран', () => {
  const html = renderToStaticMarkup(<Hero onAi={noop} onTemplate={noop} />)

  it('заголовок, подзаголовок без «Без кода», обе кнопки', () => {
    expect(text(html)).toContain(HERO_TITLE)
    expect(text(html)).toContain(HERO_SUBTITLE)
    expect(HERO_SUBTITLE).not.toMatch(/без кода/i)
    expect(text(html)).toContain(CREATE_AI.label)
    expect(text(html)).toContain(CREATE_TEMPLATE.label)
  })

  it('превью — настоящий сайт из шаблона «Барбершоп», неинтерактивный, без карты', () => {
    expect(html).toContain('md-site')
    expect(text(html)).toContain('Барбершоп «Борода»')
    expect(text(html)).toContain('Мужская стрижка')
    expect(html).toMatch(/aria-hidden="true" inert=""/)
    expect(html).not.toContain('<iframe')
    expect(PREVIEW_CARD.sections.map((s) => s.title)).toEqual(['О нас', 'Услуги и цены', 'Часы работы'])
  })

  it('слои параллакса: сетка, заголовок, превью', () => {
    for (const layer of ['parallax-grid', 'parallax-title', 'parallax-preview']) expect(html).toContain(layer)
  })
})

describe('форма шаблона', () => {
  it('поле «Название сайта» с примером', () => {
    const html = renderToStaticMarkup(<TemplateForm onCreate={async () => {}} onUseAi={noop} onCancel={noop} />)
    expect(text(html)).toContain('Название сайта')
    expect(html).toContain('placeholder="Например: Барбершоп «Борода»"')
  })
})
