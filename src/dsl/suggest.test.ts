import { describe, expect, it } from 'vitest'
import { CONTACT_ALIASES } from './schema/frontmatter.ts'
import { editDistance, suggest } from './suggest.ts'

describe('editDistance', () => {
  it.each([
    ['', '', 0],
    ['noir', 'noir', 0],
    ['noire', 'noir', 1], // лишняя буква
    ['rocet', 'rocket', 1], // пропущенная
    ['glsss', 'glass', 1], // замена
    ['titel', 'title', 1], // перестановка соседних
    ['telegramm', 'telegram', 1],
    ['', 'abc', 3],
  ])('%s ↔ %s = %i', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected)
    expect(editDistance(b, a)).toBe(expected)
  })
})

describe('suggest', () => {
  const themes = ['glass', 'minimal', 'noir', 'vercel', 'auto']

  it('находит ближайшее слово', () => {
    expect(suggest('noire', themes)).toBe('noir')
    expect(suggest('minimall', themes)).toBe('minimal')
    expect(suggest('verscel', themes)).toBe('vercel')
  })

  it('без учёта регистра', () => {
    expect(suggest('NOIR', themes)).toBe('noir')
  })

  it('совсем другое слово — без подсказки', () => {
    expect(suggest('neon', themes)).toBeNull()
    expect(suggest('', themes)).toBeNull()
  })

  it('в коротких словах опечатки не угадываем', () => {
    expect(suggest('vx', ['vk', 'max'])).toBeNull()
    expect(suggest('maxx', ['vk', 'max'])).toBe('max')
  })

  it('два одинаково близких варианта — без подсказки', () => {
    expect(suggest('cat', ['bat', 'car'])).toBeNull()
  })

  it('привычные сокращения и русские названия', () => {
    const contacts = ['telegram', 'whatsapp', 'vk', 'max', 'instagram', 'email', 'website']
    expect(suggest('tg', contacts, CONTACT_ALIASES)).toBe('telegram')
    expect(suggest('Ватсап', contacts, CONTACT_ALIASES)).toBe('whatsapp')
    expect(suggest('инста', contacts, CONTACT_ALIASES)).toBe('instagram')
  })

  it('сокращение не подсказывается, если его цели нет среди кандидатов', () => {
    expect(suggest('телефон', ['telegram', 'vk'], CONTACT_ALIASES)).toBeNull()
  })
})
