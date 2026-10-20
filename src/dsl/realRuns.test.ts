// Обработка на всех настоящих ответах этапа 5 (шаг 8, три прогона, ручные тесты): исправляет форму, удаляет только выдумки.
import { describe, expect, it } from 'vitest'
import { ALL_REAL_RUNS } from './__fixtures__/allRuns.ts'
import { STEP8_RUN3_RAW } from './__fixtures__/step8run3.ts'
import { processResponse } from './generate.ts'
import { PLACEHOLDER_MARKER } from './placeholders.ts'

const run3 = (id: string, mode: 'markdown' | 'json' = 'markdown', model = 'GigaChat-3-Lightning') => {
  const run = STEP8_RUN3_RAW.find((r) => r.id === id && r.mode === mode && r.model === model)!
  return processResponse(run.output, run.mode, run.description).autofix!
}

describe('настоящие ответы: после обработки нет ошибок и заглушек', () => {
  it(`все ${ALL_REAL_RUNS.length} ответов`, () => {
    for (const run of ALL_REAL_RUNS) {
      const { autofix } = processResponse(run.output, run.mode, run.description)
      expect(autofix, run.name).not.toBeNull()
      expect(autofix!.counts.errors, run.name).toBe(0)
      expect(autofix!.output, run.name).not.toContain(PLACEHOLDER_MARKER)
    }
  })
})

describe('незакрытая шапка (Lightning, markdown): после «Закрыть шапку» работают и проверки по описанию', () => {
  it.each(['3-nails', '4-photographer', '5-dirty', '8-photographer-messenger', '12-no-punctuation', '13-english'])('%s — шапка закрыта', (id) => {
    const autofix = run3(id)
    expect(autofix.fixedCodes).toContain('unclosed-frontmatter')
    expect(autofix.counts.errors).toBe(0)
  })

  it('5-dirty: phone из номера для WhatsApp удалён, whatsapp остался', () => {
    const { output } = run3('5-dirty')
    expect(output).not.toMatch(/^phone:/m)
    expect(output).toContain('whatsapp: +7 912 777-33-21')
  })

  it('12-no-punctuation: заглушки +7 900 000-00-00 и currency: KZT («тг» — это Telegram) удалены, telegram остался', () => {
    const { output, fixedCodes } = run3('12-no-punctuation')
    expect(output).not.toContain('900 000-00-00')
    expect(output).not.toContain('KZT')
    expect(output).toContain('telegram: ivan_borodach')
    expect(fixedCodes).toContain('ungrounded-currency')
  })

  it('8-photographer-messenger: ссылка на настоящий Instagram — остаётся', () => {
    expect(run3('8-photographer-messenger').output).toContain('instagram.com/maria_foto_ekb')
  })
})

describe('третий прогон: прочие находки', () => {
  it('7-nails-floor: маркер у настоящих услуг отрезан, цены на месте', () => {
    const { output } = run3('7-nails-floor')
    for (const line of ['title: Маникюр с покрытием\nprice: 1800', 'title: Маникюр без покрытия\nprice: 900', 'title: Педикюр\nprice: 2200', 'title: Снятие\nprice: 300']) {
      expect(output).toContain(line)
    }
  })

  it('3-nails (оба режима): whatsapp из номера, данного «по телефону», удалён; телефон остался', () => {
    for (const mode of ['markdown', 'json'] as const) {
      const { output } = run3('3-nails', mode)
      expect(output, mode).not.toContain('whatsapp:')
      expect(output, mode).toContain('phone: +7 912 345-67-89')
    }
  })

  it('1-barbershop (Lightning md): whatsapp при «Телефон +7 917…» — удалён', () => {
    expect(run3('1-barbershop').output).not.toContain('whatsapp:')
  })
})
