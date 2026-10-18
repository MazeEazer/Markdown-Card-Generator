import { describe, expect, it } from 'vitest'
import { normalizeRating, parseRating } from './rating.ts'

describe('parseRating', () => {
  it.each([['5', 5], ['1', 1], [' 4 ', 4]])('%j → %i', (value, rating) => {
    expect(parseRating(value)).toBe(rating)
  })

  it.each(['0', '6', '4.5', '5/5', 'отлично'])('%j — не оценка', (value) => {
    expect(parseRating(value)).toBeNull()
  })
})

describe('normalizeRating', () => {
  it.each([
    ['5/5', 5],
    ['4 из 5', 4],
    ['9/10', 5],
    ['8 из 10', 4],
    ['★★★★★', 5],
    ['★★★★☆', 4],
    ['⭐⭐⭐', 3],
    ['5 звёзд', 5],
    ['4 звезды', 4],
    ['5 баллов', 5],
    ['4.5', 5],
    ['4,4', 4],
    ['5★', 5],
  ])('%s → %i', (value, rating) => {
    expect(normalizeRating(value)).toBe(rating)
  })

  it.each(['10', '0', 'отлично', '6/5', '☆☆☆', ''])('%j — исправить нельзя', (value) => {
    expect(normalizeRating(value)).toBeNull()
  })
})
