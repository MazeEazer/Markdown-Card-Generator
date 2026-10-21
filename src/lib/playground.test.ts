import { describe, expect, it } from 'vitest'
import {
  countFixedCodes,
  DRAFT_KEY,
  isPlaygroundPath,
  loadDraft,
  markdownBeforeFixes,
  playgroundAllowed,
  removedLines,
  saveDraft,
  summarizeRun,
  type RunLogRow,
} from './playground'

const row = (patch: Partial<RunLogRow>): RunLogRow => ({
  stage: 'model',
  attempt: 1,
  is_final: false,
  output: null,
  fixed_codes: [],
  prompt_version: '67afb6e656ee',
  pipeline_version: 'edc3f00780a2',
  response_model: 'GigaChat-3-Ultra:32.9.16.9',
  latency_ms: 3800,
  tokens_in: 100,
  tokens_out: 300,
  errors_count: 0,
  warnings_count: 0,
  ...patch,
})

describe('playgroundAllowed', () => {
  it('в режиме разработки — всем', () => {
    expect(playgroundAllowed(undefined, { dev: true })).toBe(true)
  })
  it('в продакшене — только из списка', () => {
    expect(playgroundAllowed('u1', { dev: false, ids: 'u0, u1' })).toBe(true)
    expect(playgroundAllowed('u2', { dev: false, ids: 'u0,u1' })).toBe(false)
    expect(playgroundAllowed('u1', { dev: false })).toBe(false)
    expect(playgroundAllowed(undefined, { dev: false, ids: 'u1' })).toBe(false)
  })
})

describe('isPlaygroundPath', () => {
  it('узнаёт /playground с косой чертой и без', () => {
    expect(isPlaygroundPath('/playground')).toBe(true)
    expect(isPlaygroundPath('/playground/')).toBe(true)
    expect(isPlaygroundPath('/')).toBe(false)
    expect(isPlaygroundPath('/playground2')).toBe(false)
  })
})

describe('черновик описания', () => {
  it('сохраняется и читается', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    saveDraft('барбершоп', storage)
    expect(data.get(DRAFT_KEY)).toBe('барбершоп')
    expect(loadDraft(storage)).toBe('барбершоп')
  })
  it('не падает, если хранилище недоступно', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadDraft(broken)).toBe('')
    expect(() => saveDraft('текст', broken)).not.toThrow()
  })
})

describe('removedLines', () => {
  it('находит строки, которых нет в итоге, с учётом повторов', () => {
    const before = '---\nname: A\nphone: +7\nprice: 1\n\nprice: 1\n:::\n'
    const after = '---\nname: A\nprice: 1\n:::\n'
    expect(removedLines(before, after)).toEqual(['phone: +7', 'price: 1'])
  })
})

describe('countFixedCodes', () => {
  it('считает повторы и подписывает известные коды', () => {
    expect(countFixedCodes(['ungrounded-contact', 'x-new', 'ungrounded-contact'])).toEqual([
      { code: 'ungrounded-contact', count: 2, label: 'контакт или адрес, которого нет в описании, убран' },
      { code: 'x-new', count: 1, label: 'x-new' },
    ])
  })
})

describe('markdownBeforeFixes', () => {
  it('markdown: убирает обёртку ``` и пояснение', () => {
    expect(markdownBeforeFixes('```markdown\n---\nname: A\n---\n```', 'markdown')).toBe('---\nname: A\n---\n')
  })
  it('json: превращает ответ в разметку, null-поля отбрасывает', () => {
    const json = JSON.stringify({ name: 'Борода', title: 'Барбершоп', business: 'barbershop', phone: null, sections: [] })
    const text = markdownBeforeFixes(json, 'json')
    expect(text).toContain('name: Борода')
    expect(text).not.toContain('phone')
  })
  it('json: битый ответ — null', () => {
    expect(markdownBeforeFixes('{ не json', 'json')).toBeNull()
  })
})

describe('summarizeRun', () => {
  it('пустой журнал — null', () => {
    expect(summarizeRun([], 'markdown', null)).toBeNull()
  })

  it('берёт итоговую строку, коды обработки и убранные строки', () => {
    const output = '---\nname: A\nphone: +7 900 000-00-00\n---\n'
    const final = '---\nname: A\n---\n'
    const summary = summarizeRun(
      [
        row({ output }),
        row({ stage: 'autofix', is_final: true, output: final, fixed_codes: ['ungrounded-contact'], warnings_count: 1 }),
      ],
      'markdown',
      final,
    )
    expect(summary).toMatchObject({
      promptVersion: '67afb6e656ee',
      pipelineVersion: 'edc3f00780a2',
      responseModel: 'GigaChat-3-Ultra:32.9.16.9',
      latencyMs: 3800,
      warnings: 1,
      removedLines: ['phone: +7 900 000-00-00'],
    })
    expect(summary?.fixedCodes).toEqual([{ code: 'ungrounded-contact', count: 1, label: expect.any(String) }])
  })

  it('запуск без документа: итог — model, обработки нет', () => {
    const summary = summarizeRun([row({ is_final: true, output: 'Не могу' })], 'markdown', null)
    expect(summary?.fixedCodes).toEqual([])
    expect(summary?.removedLines).toEqual([])
  })
})
