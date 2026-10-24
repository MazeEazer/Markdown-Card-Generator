// Диалог «Сайт с ИИ»: выбора модели и режима нет (только в песочнице), выбор ниши есть.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GENERATION_MODELS } from '../dsl/generate'
import { GenerateSiteDialog } from './GenerateSiteDialog'

// Вызов функции generate-site в разметке не нужен — без него тест не тянет клиент Supabase
vi.mock('../lib/generateSite', () => ({ generateSiteFromDescription: vi.fn() }))

describe('GenerateSiteDialog', () => {
  const html = renderToStaticMarkup(
    <GenerateSiteDialog createSite={async () => ({ data: null, error: null })} onCreated={() => {}} onClose={() => {}} />,
  )

  it('нет «Настроек для эксперимента»: ни выбора модели, ни режима', () => {
    expect(html).not.toContain('Настройки для эксперимента')
    expect(html).not.toContain('<select')
    for (const model of GENERATION_MODELS) expect(html).not.toContain(model)
    expect(html).not.toContain('markdown')
  })

  it('выбор вида бизнеса на месте', () => {
    expect(html).toContain('aria-label="Вид бизнеса"')
    expect(html).toContain('Не важно')
    expect(html).toContain('Барбершоп')
  })
})
