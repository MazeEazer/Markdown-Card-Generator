// Тест к src/dsl/codes.ts. Лежит вне src/dsl/: читает исходники правил через import.meta.glob (Vite),
// а в src/dsl/ разрешён только код без API сред — его проверяет tsconfig.dsl.json.
import { describe, expect, it } from 'vitest'
import { MISSING_DATA_CODES, MODEL_FIXABLE_CODES } from '../dsl/codes.ts'

const SOURCES = import.meta.glob<string>(['../dsl/rules/*.ts', '!../dsl/rules/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Коды и важность из исходников правил: `code: '…'` и ближайший `severity` перед ним. */
function ruleCodes(): Map<string, Set<string>> {
  const codes = new Map<string, Set<string>>()
  for (const source of Object.values(SOURCES)) {
    for (const match of source.matchAll(/code: '([a-z-]+)'/g)) {
      const before = source.slice(Math.max(0, match.index - 200), match.index)
      const severity = [...before.matchAll(/severity: '(\w+)'/g)].at(-1)?.[1] ?? 'unknown'
      codes.set(match[1], (codes.get(match[1]) ?? new Set()).add(severity))
    }
  }
  return codes
}

describe('классификация кодов для AI-генерации', () => {
  const codes = ruleCodes()

  it('в правилах 38 кодов', () => {
    expect(codes.size).toBe(38)
  })

  it('каждое предупреждение и подсказка — ровно в одном списке', () => {
    for (const [code, severities] of codes) {
      if (severities.has('error') && severities.size === 1) continue
      const lists = [MISSING_DATA_CODES.has(code), MODEL_FIXABLE_CODES.has(code)].filter(Boolean)
      expect(lists, code).toHaveLength(1)
    }
  })

  it('в списках только существующие коды и нет ошибок', () => {
    for (const code of [...MISSING_DATA_CODES, ...MODEL_FIXABLE_CODES]) {
      expect(codes.has(code), code).toBe(true)
      expect(codes.get(code)!.has('error'), code).toBe(false)
    }
  })
})
