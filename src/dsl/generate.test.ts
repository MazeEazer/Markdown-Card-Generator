import { describe, expect, it } from 'vitest'
import { fromJson } from './fromJson.ts'
import {
  type ChatMessage,
  type ChatModel,
  extractDocument,
  generateSite,
  type GenerateOptions,
  type ModelReply,
  outcomeMessage,
} from './generate.ts'
import { buildSystemPrompt, EXAMPLE_DOCUMENT, EXAMPLE_JSON } from './prompt.ts'
import { serialize } from './serialize.ts'

const DESCRIPTION = 'Барбершоп «Борода» в Самаре, ул. Ленина, 10. Стрижка 1500, борода 800. Телефон 8-999-123-45-67'

const VALID = '---\nname: Борода\nphone: +7 999 123-45-67\n---\n\n## Услуги\n:::services\ntitle: Стрижка\nprice: 1500\n:::\n'
/** Ошибка без автоисправления: неизвестный блок */
const UNKNOWN_BLOCK = VALID.replace(':::services', ':::prices')
/** Две ошибки без автоисправления */
const TWO_ERRORS = `${UNKNOWN_BLOCK}\n## Ещё\n:::pricez\ntitle: A\n:::\n`

/** Поддельная нейросеть: отвечает по сценарию и запоминает запросы. */
function scripted(...replies: (string | ModelReply | Error)[]) {
  const calls: { messages: ChatMessage[]; timeoutMs: number }[] = []
  const model: ChatModel = async (messages, { timeoutMs }) => {
    calls.push({ messages, timeoutMs })
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)]
    if (reply instanceof Error) throw reply
    return typeof reply === 'string' ? { text: reply, finishReason: 'stop' } : reply
  }
  return { model, calls }
}

function run(model: ChatModel, options: Partial<GenerateOptions> = {}) {
  return generateSite({ description: DESCRIPTION, mode: 'markdown', model, deadlineMs: 60_000, ...options })
}

describe('extractDocument', () => {
  it('снимает ``` и пояснение до шапки', () => {
    expect(extractDocument('Вот ваш сайт:\n```markdown\n---\nname: A\n---\n```\nГотово!', 'markdown')).toBe('---\nname: A\n---\n')
    expect(extractDocument('Конечно!\n\n---\nname: A\n---', 'markdown')).toBe('---\nname: A\n---\n')
  })

  it('в режиме json берёт объект между первой { и последней }', () => {
    expect(extractDocument('```json\n{"name": "A"}\n```', 'json')).toBe('{"name": "A"}')
    expect(extractDocument('Ответ: {"name": "A", "x": {}} — готово', 'json')).toBe('{"name": "A", "x": {}}')
  })
})

describe('generateSite: markdown', () => {
  it('валидный ответ с первой попытки — один запрос', async () => {
    const { model, calls } = scripted(VALID)
    const result = await run(model)
    expect(result.outcome).toBe('valid')
    expect(result.attempts).toHaveLength(1)
    expect(result.best).toBe(result.attempts[0])
    expect(result.best!.markdown).toBe(VALID)
    expect(outcomeMessage(result.outcome, result.best)).toBeNull()
    // Системный промпт — из схемы, первый запрос — описание пользователя
    expect(calls[0].messages).toEqual([
      { role: 'system', content: buildSystemPrompt({ mode: 'markdown' }) },
      { role: 'user', content: `Описание бизнеса:\n${DESCRIPTION}` },
    ])
  })

  it('вид бизнеса попадает в системный промпт', async () => {
    const { model, calls } = scripted(VALID)
    await run(model, { business: 'barbershop' })
    expect(calls[0].messages[0].content).toBe(buildSystemPrompt({ mode: 'markdown', business: 'barbershop' }))
  })

  it('пример документа из промпта проходит проверку без ошибок', async () => {
    const result = await run(scripted(EXAMPLE_DOCUMENT).model)
    expect(result.outcome).toBe('valid')
    expect(result.best!.fixedByRules).toEqual([])
  })

  it('исправимое чинит валидатор — без второго запроса к нейросети', async () => {
    // Незакрытый блок перед следующим — ошибка с автоисправлением; телефон с восьмёркой — предупреждение
    const dirty = '---\nname: Борода\nphone: 8-999-123-45-67\n---\n## Услуги\n:::services\ntitle: Стрижка\n\n:::hours\nпн–вс: 10:00–20:00\n:::\n'
    const { model, calls } = scripted(dirty)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
    const attempt = result.attempts[0]
    expect(attempt.output).toBe(dirty)
    expect(attempt.errorsBeforeFixes).toBe(1)
    expect(attempt.errorsCount).toBe(0)
    expect(attempt.fixedByRules).toEqual(expect.arrayContaining(['nested-fence', 'phone-format']))
    expect(attempt.markdown).toContain('phone: +7 999 123-45-67')
  })

  it('предупреждения (нет контактов) нейросети не возвращаются — иначе она выдумает телефон', async () => {
    const noContacts = '---\nname: Борода\n---\n\n## О нас\nСтрижём.\n'
    const { model, calls } = scripted(noContacts)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
    expect(result.best!.diagnostics.map((d) => d.code)).toContain('no-contacts')
  })

  it('заглушку вместо названия не вставляет — просит нейросеть', async () => {
    const { model, calls } = scripted('---\nphone: +7 999 123-45-67\n---\n', VALID)
    const result = await run(model)
    expect(result.attempts[0].markdown).not.toContain('Моё название')
    expect(result.attempts[0].errorsCount).toBe(1)
    expect(calls[1].messages[1].content).toContain('В шапке нет названия')
    expect(result.outcome).toBe('valid')
  })

  it('запрос на исправление: описание, документ после автоисправлений и ошибки с номерами строк', async () => {
    const withFixable = UNKNOWN_BLOCK.replace('+7 999 123-45-67', '89991234567')
    const { model, calls } = scripted(withFixable, VALID)
    const result = await run(model)
    expect(result.outcome).toBe('valid')
    expect(result.attempts.map((a) => a.errorsCount)).toEqual([1, 0])

    const request = calls[1].messages[1].content
    expect(calls[1].messages[0].role).toBe('system')
    expect(request).toBe(result.attempts[1].request)
    expect(request).toContain(DESCRIPTION)
    // Документ — уже с исправленным телефоном, чтобы модель не откатила исправление
    expect(request).toContain(UNKNOWN_BLOCK)
    expect(request).toMatch(/- строка 7 \(«:::prices»\): .*prices/)
  })

  it('нет прогресса — остановка, результат — лучшая попытка, а не последняя', async () => {
    const { model, calls } = scripted(UNKNOWN_BLOCK, TWO_ERRORS)
    const result = await run(model)
    expect(calls).toHaveLength(2)
    expect(result.outcome).toBe('no-progress')
    expect(result.best).toBe(result.attempts[0])
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/остались ошибки/)
  })

  it('ошибок меньше с каждой попыткой — до трёх попыток', async () => {
    const three = `${TWO_ERRORS}\n## И ещё\n:::pricex\ntitle: B\n:::\n`
    const { model, calls } = scripted(three, TWO_ERRORS, UNKNOWN_BLOCK, VALID)
    const result = await run(model)
    expect(calls).toHaveLength(3)
    expect(result.outcome).toBe('max-attempts')
    expect(result.attempts.map((a) => [a.attempt, a.errorsCount])).toEqual([[1, 3], [2, 2], [3, 1]])
    expect(result.best).toBe(result.attempts[2])
  })

  it('maxAttempts: 2 — две попытки', async () => {
    const result = await run(scripted(TWO_ERRORS, UNKNOWN_BLOCK, VALID).model, { maxAttempts: 2 })
    expect(result.outcome).toBe('max-attempts')
    expect(result.attempts).toHaveLength(2)
  })

  it('токены, finish_reason и время попытки записываются', async () => {
    let clock = 1000
    const model: ChatModel = async () => {
      clock += 2500
      return { text: VALID, finishReason: 'stop', tokensIn: 5000, tokensOut: 300 }
    }
    const [attempt] = (await run(model, { now: () => clock })).attempts
    expect(attempt).toMatchObject({ finishReason: 'stop', tokensIn: 5000, tokensOut: 300, latencyMs: 2500 })
  })
})

describe('generateSite: особые исходы', () => {
  it('blacklist — отказ фильтра, документа нет', async () => {
    const { model, calls } = scripted({ text: 'Не люблю менять тему разговора, но вот сейчас тот самый случай.', finishReason: 'blacklist' })
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('blacklist')
    expect(result.best).toBeNull()
    expect(result.attempts[0]).toMatchObject({ finishReason: 'blacklist', markdown: null })
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/другими словами/)
  })

  it('blacklist на исправлении — остаётся лучшее из готового', async () => {
    const result = await run(scripted(UNKNOWN_BLOCK, { text: '…', finishReason: 'blacklist' }).model)
    expect(result.outcome).toBe('blacklist')
    expect(result.best).toBe(result.attempts[0])
  })

  it('length — ответ обрезан: остановка, документ показывается с предупреждением', async () => {
    const cut = VALID.slice(0, VALID.indexOf('price'))
    const { model, calls } = scripted({ text: cut, finishReason: 'length' }, VALID)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('length')
    // Незакрытый блок закрыло автоисправление
    expect(result.best!.errorsCount).toBe(0)
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/оборвался/)
  })

  it('дедлайн: оставшееся время передаётся нейросети, по истечении — остановка', async () => {
    let clock = 0
    const timeouts: number[] = []
    const replies = [TWO_ERRORS, UNKNOWN_BLOCK, VALID]
    const model: ChatModel = async (_messages, { timeoutMs }) => {
      timeouts.push(timeoutMs)
      clock += 25_000
      return { text: replies[timeouts.length - 1] }
    }
    const result = await run(model, { deadlineMs: 50_000, now: () => clock })
    expect(timeouts).toEqual([50_000, 25_000])
    expect(result.outcome).toBe('deadline')
    expect(result.best).toBe(result.attempts[1])
  })

  it('ошибка нейросети на первой попытке пробрасывается — до модели не дошли', async () => {
    await expect(run(scripted(new Error('Chat 429')).model)).rejects.toThrow('Chat 429')
  })

  it('ошибка на повторной попытке — остаётся лучшее из готового', async () => {
    const result = await run(scripted(UNKNOWN_BLOCK, new Error('Chat 500')).model)
    expect(result.outcome).toBe('model-error')
    expect(result.best).toBe(result.attempts[0])
  })

  it('таймаут повторной попытки по дедлайну — исход deadline', async () => {
    let clock = 0
    let calls = 0
    const model: ChatModel = async () => {
      calls++
      if (calls === 1) return { text: UNKNOWN_BLOCK }
      clock = 70_000
      throw new Error('timeout')
    }
    const result = await run(model, { now: () => clock })
    expect(result.outcome).toBe('deadline')
    expect(result.best).toBe(result.attempts[0])
  })
})

describe('generateSite: json', () => {
  const example = JSON.stringify(EXAMPLE_JSON)

  it('JSON по схеме → разметка через serialize', async () => {
    const { model, calls } = scripted(`\`\`\`json\n${example}\n\`\`\``)
    const result = await generateSite({ description: DESCRIPTION, mode: 'json', model, deadlineMs: 60_000 })
    expect(calls[0].messages[0].content).toBe(buildSystemPrompt({ mode: 'json' }))
    expect(result.outcome).toBe('valid')
    expect(result.best!.markdown).toBe(serialize(fromJson(EXAMPLE_JSON)))
  })

  it('лишнее поле — ошибка схемы с путём, нейросеть исправляет', async () => {
    const extra = JSON.stringify({ ...EXAMPLE_JSON, sections: [{ type: 'map', title: 'Где мы', floor: 2 }] })
    const { model, calls } = scripted(extra, example)
    const result = await generateSite({ description: DESCRIPTION, mode: 'json', model, deadlineMs: 60_000 })
    expect(result.attempts[0]).toMatchObject({ markdown: null, errorsCount: 1 })
    expect(result.attempts[0].diagnostics[0].code).toBe('json-schema')
    const request = calls[1].messages[1].content
    expect(request).toContain(DESCRIPTION)
    expect(request).toContain(extra)
    expect(request).toMatch(/- sections\[0\]: .*floor/)
    expect(request).toMatch(/верни JSON целиком/)
    expect(result.outcome).toBe('valid')
  })

  it('от «не JSON» к ошибкам схемы — это прогресс', async () => {
    const twoIssues = JSON.stringify({ ...EXAMPLE_JSON, theme: 'neon', accent: 'red' })
    const { model, calls } = scripted('{"name": ', twoIssues, example)
    const result = await generateSite({ description: DESCRIPTION, mode: 'json', model, deadlineMs: 60_000 })
    expect(calls).toHaveLength(3)
    expect(result.attempts.map((a) => a.diagnostics[0]?.code ?? null)).toEqual(['json-syntax', 'json-schema', null])
    expect(result.outcome).toBe('valid')
  })

  it('ни одного разобранного JSON — документа нет', async () => {
    const result = await generateSite({ description: DESCRIPTION, mode: 'json', model: scripted('не знаю').model, deadlineMs: 60_000 })
    expect(result.outcome).toBe('no-progress')
    expect(result.best).toBeNull()
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/Не получилось/)
  })
})
