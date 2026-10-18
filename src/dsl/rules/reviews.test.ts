import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../../lib/parser.ts'
import { doc, findAll, findOne, fixAndRecheck, underlined } from './testHelpers.ts'

function reviews(...items: string[]): string {
  return doc('phone: +7 999 123-45-67', `## Отзывы\n:::reviews\n${items.join('\n\n')}\n:::`)
}

describe(':::reviews — разбор', () => {
  it('отзывы с оценкой и датой', () => {
    const data = parseCardMarkdown(
      reviews('author: Алексей\ntext: Лучший фейд\nrating: 5\ndate: март 2026', 'author: Ольга\ntext: Аккуратно'),
    ).data!
    expect(data.sections[0].type).toBe('reviews')
    expect(data.sections[0].reviews).toEqual([
      { author: 'Алексей', text: 'Лучший фейд', rating: 5, date: 'март 2026' },
      { author: 'Ольга', text: 'Аккуратно', rating: undefined, date: undefined },
    ])
  })

  it('неправильная оценка на сайт не попадает', () => {
    const data = parseCardMarkdown(reviews('author: А\ntext: Б\nrating: 5/5')).data!
    expect(data.sections[0].reviews![0].rating).toBeUndefined()
  })

  it('отзыв без текста — предупреждение о пропущенном поле', () => {
    expect(findOne(reviews('author: Алексей'), 'missing-item-field').message).toMatch(/«text»/)
  })
})

describe('rating-invalid', () => {
  it.each([
    ['5/5', '5'],
    ['★★★★☆', '4'],
    ['5 звёзд', '5'],
    ['9 из 10', '5'],
  ])('rating: %s → %s', (raw, fixed) => {
    const text = reviews(`author: Алексей\ntext: Отлично\nrating: ${raw}`)
    const d = findOne(text, 'rating-invalid')
    expect(underlined(text, d)).toBe(raw)
    const after = fixAndRecheck(text, d)
    expect(parseCardMarkdown(after).data!.sections[0].reviews![0].rating).toBe(Number(fixed))
  })

  it.each(['10', 'отлично', '0'])('rating: %s — без исправления', (raw) => {
    const d = findOne(reviews(`author: Алексей\ntext: Отлично\nrating: ${raw}`), 'rating-invalid')
    expect(d.fix).toBeUndefined()
    expect(d.message).toMatch(/от 1 до 5/)
  })

  it('правильная оценка — без замечаний', () => {
    expect(findAll(reviews('author: Алексей\ntext: Отлично\nrating: 4'), 'rating-invalid')).toEqual([])
  })
})
