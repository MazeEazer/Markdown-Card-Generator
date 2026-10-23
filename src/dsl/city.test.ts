import { describe, expect, it } from 'vitest'
import { CITY_FILLED, fillCity, TITLE_IS_CITY } from './city.ts'

const doc = (fields: string) => `---\nname: Фотограф Олег\n${fields}---\n\n## Обо мне\nТекст\n`

describe('fillCity', () => {
  it('город назван, city нет — заполняется (в конец шапки)', () => {
    expect(fillCity(doc(''), 'Фотограф Олег, Тула')).toEqual({ text: doc('city: Тула\n'), applied: [CITY_FILLED] })
  })

  it('city пуст — заполняется; уже заполнен или есть location — не трогаем', () => {
    expect(fillCity(doc('city:\n'), 'Фотограф Олег, Тула').text).toBe(doc('city: Тула\n'))
    const filled = doc('city: Самара\n')
    expect(fillCity(filled, 'Фотограф Олег, Тула')).toEqual({ text: filled, applied: [] })
    const location = doc('location: Тула\n')
    expect(fillCity(location, 'Фотограф Олег, Тула')).toEqual({ text: location, applied: [] })
  })

  it('title только из города — убирается; обычный title остаётся', () => {
    expect(fillCity(doc('title: Тула\n'), 'Фотограф Олег, Тула')).toEqual({ text: doc('city: Тула\n'), applied: [CITY_FILLED, TITLE_IS_CITY] })
    const kept = doc('title: Фотограф в Туле\ncity: Тула\n')
    expect(fillCity(kept, 'Фотограф Олег, Тула')).toEqual({ text: kept, applied: [] })
  })

  it('города в описании нет или их несколько — не угадываем', () => {
    expect(fillCity(doc(''), 'Фотограф Олег')).toEqual({ text: doc(''), applied: [] })
    expect(fillCity(doc(''), 'Из Москвы в Тулу')).toEqual({ text: doc(''), applied: [] })
  })

  it('нет шапки — без изменений', () => {
    expect(fillCity('## Обо мне\nТекст\n', 'Тула')).toEqual({ text: '## Обо мне\nТекст\n', applied: [] })
  })
})
