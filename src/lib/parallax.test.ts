import { describe, expect, it } from 'vitest'
import { parallaxOffset } from './parallax'

describe('parallaxOffset', () => {
  it('прокрутка в пределах первого экрана — как есть', () => {
    expect(parallaxOffset(120.4, 800, false)).toBe(120)
  })

  it('ниже первого экрана — не растёт, выше начала (отскок на macOS) — ноль', () => {
    expect(parallaxOffset(2000, 800, false)).toBe(800)
    expect(parallaxOffset(-40, 800, false)).toBe(0)
  })

  it('prefers-reduced-motion — без движения', () => {
    expect(parallaxOffset(300, 800, true)).toBe(0)
  })
})
