import { describe, expect, it } from 'vitest'
import { saveStartIntent, takeStartIntent } from './startIntent'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('startIntent: кнопка первого экрана до входа', () => {
  it('после входа открывается выбранная форма — один раз', () => {
    const storage = memory()
    saveStartIntent('template', storage)
    expect(takeStartIntent(storage)).toBe('template')
    expect(takeStartIntent(storage)).toBeNull()
  })

  it('чужое значение и недоступное хранилище — ничего не открываем', () => {
    const storage = memory()
    storage.setItem('mdcard:start-intent', 'editor')
    expect(takeStartIntent(storage)).toBeNull()
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => {} }
    expect(() => saveStartIntent('ai', broken)).not.toThrow()
    expect(takeStartIntent(broken)).toBeNull()
  })
})
