import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from './parser'
import { exportHtml } from './exportHtml'
import { hoursScript } from './hoursScript'
import { resolveTheme } from './themeEngine'

function exported(markdown: string): string {
  const data = parseCardMarkdown(markdown).data!
  return exportHtml(data, resolveTheme(data, 'minimal')).html
}

const withHours = '---\nname: Борода\n---\n## Часы\n:::hours\nпн–пт: 10:00–20:00\nсб, вс: выходной\n:::\n'

describe('экспорт HTML', () => {
  it('скрипт часов работы — только если есть блок :::hours', () => {
    expect(exported(withHours)).toContain('<script>')
    expect(exported('---\nname: Борода\n---\n## О нас\nТекст\n')).not.toContain('<script>')
  })
})

/** Минимальная «страница» для скрипта: элементы с атрибутами и стилями. */
function fakeElement(attributes: Record<string, string>) {
  const text = { textContent: '' }
  return {
    style: {} as Record<string, string>,
    text,
    getAttribute: (name: string) => attributes[name] ?? null,
    querySelector: () => text,
  }
}

describe('hoursScript', () => {
  it('пересчитывает бейдж и выделяет сегодняшний день по часам посетителя', () => {
    const rows = [{ days: [0, 1, 2, 3, 4], open: '10:00', close: '20:00' }, { days: [5, 6], closed: true }]
    const badge = fakeElement({ 'data-md-hours': JSON.stringify(rows), 'data-open-color': '#00aa00', 'data-closed-color': '#888888' })
    const monday = fakeElement({ 'data-md-days': '0,1,2,3,4', 'data-color': 'gray', 'data-today-color': 'black' })
    const weekend = fakeElement({ 'data-md-days': '5,6', 'data-color': 'gray', 'data-today-color': 'black' })
    const document = {
      querySelectorAll: (selector: string) => (selector === '[data-md-hours]' ? [badge] : [monday, weekend]),
    }

    // Понедельник, 12:00 — открыто
    class FakeDate extends Date {
      constructor() {
        super(2026, 9, 19, 12, 0) // 19.10.2026 — понедельник
      }
    }
    new Function('document', 'Date', hoursScript())(document, FakeDate)

    expect(badge.text.textContent).toBe('Открыто до 20:00')
    expect(badge.style.color).toBe('#00aa00')
    expect(monday.style.fontWeight).toBe('600')
    expect(weekend.style.fontWeight).toBe('400')
  })
})
