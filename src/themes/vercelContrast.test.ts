import { describe, expect, it } from 'vitest'
import { contrast, MIN_TEXT_CONTRAST } from '../dsl/color'
import { parseCardMarkdown } from '../lib/parser'
import { resolveTheme } from '../lib/themeEngine'
import { readableOn } from './shared/colors'

describe('vercel: accent #ffffff — читаемость', () => {
  const card = parseCardMarkdown(`---\nname: Иван Петров\nphone: +7 999 123-45-67\nbusiness: photographer\ntheme: vercel\naccent: "#ffffff"\n---\n\n## О себе\nТекст\n`).data!
  const { colors } = resolveTheme(card)

  it('акцент — белый на чёрном фоне: цены и ссылки читаются (контраст ≥ 4,5)', () => {
    expect(colors.accent).toBe('#ffffff')
    expect(contrast(colors.accent, colors.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrast(colors.accent, colors.surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('текст на залитой белой кнопке — тёмный, контраст ≥ 4,5', () => {
    expect(readableOn(colors.accent)).toBe('#111111')
    expect(contrast(readableOn(colors.accent), colors.accent)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('приглушённый текст на чёрном фоне тоже читается', () => {
    expect(contrast(colors.textMuted, colors.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('цвет из шапки в этой теме не используется — белый остаётся, что бы ни написала модель', () => {
    const other = parseCardMarkdown(`---\nname: Иван\ntheme: vercel\naccent: "#ff0000"\n---\n\n## О себе\nТекст\n`).data!
    expect(resolveTheme(other).colors.accent).toBe('#ffffff')
  })
})
