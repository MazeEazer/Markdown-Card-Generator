import { describe, expect, it } from 'vitest'
import { formatPrice, isValidPrice, normalizePrice, parsePrice } from './price.ts'

describe('parsePrice', () => {
  it.each([
    ['1500', { from: 1500, to: undefined, atLeast: false }],
    ['от 1500', { from: 1500, to: undefined, atLeast: true }],
    ['1500–2000', { from: 1500, to: 2000, atLeast: false }],
    ['1500 - 2000', { from: 1500, to: 2000, atLeast: false }],
  ])('%s', (value, expected) => {
    expect(parsePrice(value)).toEqual(expected)
  })

  it.each(['1500р', '1 500', 'дорого', ''])('%j — не число', (value) => {
    expect(parsePrice(value)).toBeNull()
  })
})

describe('isValidPrice', () => {
  it('числа и слова', () => {
    expect(isValidPrice('от 1500')).toBe(true)
    expect(isValidPrice('бесплатно')).toBe(true)
    expect(isValidPrice('По договорённости')).toBe(true)
    expect(isValidPrice('1500р')).toBe(false)
  })
})

describe('normalizePrice', () => {
  it.each([
    ['1500р', '1500'],
    ['1500 р.', '1500'],
    ['1500 ₽', '1500'],
    ['1 500 ₽', '1500'],
    ['1500 руб.', '1500'],
    ['1500 рублей', '1500'],
    ['₽1500', '1500'],
    ['от1500р', 'от 1500'],
    ['от 1 500 руб', 'от 1500'],
    ['1 500–2 000 ₽', '1500–2000'],
  ])('%s → %s', (value, expected) => {
    expect(normalizePrice(value)).toBe(expected)
  })

  it.each(['дорого', '1500 $', '15.00'])('%j — исправить нельзя', (value) => {
    expect(normalizePrice(value)).toBeNull()
  })
})

describe('formatPrice', () => {
  it.each([
    ['1500', '1 500 ₽'],
    ['от 1500', 'от 1 500 ₽'],
    ['1500–2000', '1 500–2 000 ₽'],
    ['800', '800 ₽'],
    ['бесплатно', 'бесплатно'],
  ])('%s → %j', (value, expected) => {
    expect(formatPrice(value)).toBe(expected)
  })
})
