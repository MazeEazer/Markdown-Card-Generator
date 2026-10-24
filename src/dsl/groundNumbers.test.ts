import { describe, expect, it } from 'vitest'
import { MANUAL_RUNS } from './__fixtures__/manual.ts'
import { STEP8_RUNS } from './__fixtures__/step8.ts'
import { STEP8_RUN2_RAW } from './__fixtures__/step8run2.ts'
import { processResponse } from './generate.ts'
import { groundNumbers, UNGROUNDED_NUMBER } from './groundNumbers.ts'

const services = (fields: string) => `---\nname: A\n---\n\n## Услуги\n:::services\ntitle: Услуга\n${fields}\n:::\n`
const hours = (lines: string) => `---\nname: A\n---\n\n## Часы\n:::hours\n${lines}\n:::\n`
const kept = (text: string, description: string) => groundNumbers(text, description).removed.length === 0

describe('groundNumbers: цены', () => {
  it('цена из описания — в любой записи', () => {
    expect(kept(services('price: 1500'), 'стрижка 1500р')).toBe(true)
    expect(kept(services('price: 1500'), 'стрижка 1 500 ₽')).toBe(true)
    expect(kept(services('price: от 40000'), 'свадьба — от 40 000 руб.')).toBe(true)
    expect(kept(services('price: от 100 за ноготь'), 'дизайн — от 100 ₽ за ноготь')).toBe(true)
    expect(kept(services('price: 1500–2000'), 'стрижка 1500-2000')).toBe(true)
  })

  it('цена без чисел остаётся; выдуманная — удаляется, услуга остаётся', () => {
    expect(kept(services('price: бесплатно'), 'пробное занятие бесплатно')).toBe(true)
    const { text, removed } = groundNumbers(services('price: 1500'), 'Маникюр тольятти')
    expect(removed).toEqual([UNGROUNDED_NUMBER])
    expect(text).toBe('---\nname: A\n---\n\n## Услуги\n:::services\ntitle: Услуга\n:::\n')
  })

  it('цифры телефона — не цены и не часы', () => {
    expect(kept(services('price: 846'), 'звоните 8-846-200-30-40')).toBe(false)
    expect(kept(hours('пн–пт: 10:00–20:00'), 'звоните 8-846-200-30-40, замена масла 800')).toBe(false)
  })
})

describe('groundNumbers: длительность', () => {
  it('«час» = 60 мин, единицы не важны', () => {
    expect(kept(services('duration: 60 мин'), 'Час съёмки — 5000 руб.')).toBe(true)
    expect(kept(services('duration: час'), 'Час съёмки — 5000 руб.')).toBe(true)
    expect(kept(services('duration: 60 мин'), 'Урок 60 минут')).toBe(true)
    expect(kept(services('duration: 45 мин'), '1000 за урок 45 мин')).toBe(true)
    expect(kept(services('duration: 2 часа'), 'съёмка 120 минут')).toBe(true)
    expect(kept(services('duration: 1,5 часа'), 'урок 1,5 часа')).toBe(true)
  })

  it('выдуманная длительность удаляется; без чисел и «часа» — остаётся', () => {
    expect(kept(services('duration: 60 мин'), 'Маникюр тольятти')).toBe(false)
    expect(kept(services('duration: 90 мин'), 'Урок 60 минут')).toBe(false)
    expect(kept(services('duration: весь день'), 'свадьба целый день')).toBe(true)
  })
})

describe('groundNumbers: часы работы', () => {
  it('«с 10ти до 8ми» → 10:00–20:00, «10 20», «с 9 до 21», минуты', () => {
    expect(kept(hours('вт–вс: 10:00–20:00\nпн: выходной'), 'работаю с 10ти до 8ми кроме понедельника')).toBe(true)
    expect(kept(hours('ежедневно: 10:00–20:00'), 'работаем каждый день 10 20')).toBe(true)
    expect(kept(hours('ежедневно: 9:00–21:00'), 'Работаем ежедневно с 9 до 21.')).toBe(true)
    expect(kept(hours('пн–пт: 9:30–18:00'), 'будни 9:30–18')).toBe(true)
    expect(kept(hours('пн–пт: 9:30–18:00'), 'будни с 9 до 18')).toBe(false)
  })

  it('вывод «вс: выходной» из «пн–сб» — допустим (дни не проверяются)', () => {
    expect(kept(hours('пн–сб: 9:00–20:00\nвс: выходной'), 'Работаю пн–сб с 9 до 20')).toBe(true)
  })

  it('не подтвердилась одна строка — часы удаляются целиком, раздел — вместе с ними', () => {
    const text = '---\nname: A\n---\n\n## О нас\nТекст.\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\n:::\n'
    const { removed } = groundNumbers(text, 'с 10 до 20')
    expect(removed).toEqual([UNGROUNDED_NUMBER])
    const { autofix } = processResponse(text, 'markdown', 'с 10 до 20')
    expect(autofix!.output).toBe('---\nname: A\n---\n\n## О нас\nТекст.\n')
    expect(autofix!.fixedCodes).toEqual([UNGROUNDED_NUMBER, 'hours-empty'])
  })

  it('круглосуточно — только если так сказано', () => {
    expect(kept(hours('ежедневно: круглосуточно'), 'работаем круглосуточно')).toBe(true)
    expect(kept(hours('ежедневно: круглосуточно'), 'работаем ежедневно')).toBe(false)
  })
})

describe('groundNumbers: на всех настоящих ответах — ни одного ложного удаления', () => {
  it('шаг 8 (оба прогона) и ручные тесты: удалены только выдумки m4 и m5', () => {
    const all = [
      ...STEP8_RUNS.map((r) => ({ name: `run1/${r.id}/${r.mode}`, text: r.markdown, description: r.description })),
      ...MANUAL_RUNS.map((r) => ({ name: `manual/${r.id}`, text: r.markdown, description: r.description })),
    ]
    const removedLines = Object.fromEntries(
      all.map((r) => {
        const after = new Set(groundNumbers(r.text, r.description).text.split('\n'))
        return [r.name, r.text.split('\n').filter((line) => !after.has(line))]
      }).filter(([, lines]) => lines.length),
    )
    expect(removedLines).toEqual({
      'manual/m4-minimal-input': ['price: 1500', 'duration: 60 мин', 'price: от 800', 'пн–пт: 10:00–20:00', 'сб: 11:00–18:00', 'вс: выходной'],
      'manual/m5-car-service': ['пн–пт: 10:00–20:00', 'сб: выходной', 'вс: выходной'],
    })
  })

  it('второй прогон (сырые ответы, оба режима, весь конвейер): ни одно число не удалено', () => {
    for (const r of STEP8_RUN2_RAW) {
      expect(processResponse(r.output, r.mode, r.description).autofix!.fixedCodes, `${r.id}/${r.mode}`).not.toContain(UNGROUNDED_NUMBER)
    }
  })
})
