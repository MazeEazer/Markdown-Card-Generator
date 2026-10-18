import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

describe('unclosed-fence', () => {
  it('блок, проглотивший следующий раздел, закрывается перед ним', () => {
    const text = doc('', '## FAQ\n:::accordion\ntitle: Вопрос\ncontent: Ответ\n## Контакты\nТелефон')
    const d = findOne(text, 'unclosed-fence')
    expect(d.severity).toBe('error')
    expect(underlined(text, d)).toBe(':::accordion')

    const fixed = fixAndRecheck(text, d)
    expect(fixed).toContain('content: Ответ\n:::\n## Контакты')
    expect(parseCardMarkdown(fixed).data!.sections.map((s) => s.title)).toEqual(['FAQ', 'Контакты'])
  })

  it('блок в конце документа закрывается в конце', () => {
    const text = doc('', ':::code lang="js"\nlet x')
    expect(fixAndRecheck(text, findOne(text, 'unclosed-fence'))).toMatch(/let x\n:::$/)
  })

  it('закрытый блок — без ошибок', () => {
    expect(findAll(doc('', ':::cards\ntitle: A\n:::'), 'unclosed-fence')).toEqual([])
  })
})

describe('nested-fence', () => {
  it('новый блок внутри незакрытого предыдущего', () => {
    const text = doc('', ':::cards\ntitle: A\n:::accordion\ntitle: В\ncontent: О\n:::')
    const d = findOne(text, 'nested-fence')
    expect(underlined(text, d)).toBe(':::accordion')
    const fixed = fixAndRecheck(text, d)
    expect(parseCardMarkdown(fixed).data!.sections[0].type).toBe('accordion')
  })
})
