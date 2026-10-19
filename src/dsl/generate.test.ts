import { describe, expect, it } from 'vitest'
import { fromJson } from './fromJson.ts'
import {
  type Attempt,
  type ChatMessage,
  type ChatModel,
  extractDocument,
  generateSite,
  type GenerateOptions,
  ModelNotReachedError,
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
/** Без ошибок, но с промахом модели — выдуманным полем */
const WITH_FIXABLE_WARNING = VALID.replace('price: 1500', 'price: 1500\nmaster: Иван')

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

const errors = (a: Attempt) => a.autofix?.counts.errors ?? a.model.counts.errors
const request = (calls: { messages: ChatMessage[] }[], n: number) => calls[n].messages[1].content

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
    expect(result.best!.autofix!.output).toBe(VALID)
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

  it('пример документа из промпта проходит проверку без ошибок и исправлений', async () => {
    const { model, calls } = scripted(EXAMPLE_DOCUMENT)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
    expect(result.best!.autofix!.fixedCodes).toEqual([])
  })

  it('исправимое чинит валидатор — без второго запроса; замечания до и после исправлений', async () => {
    // Незакрытый блок перед следующим — ошибка с автоисправлением; телефон с восьмёркой — предупреждение
    const dirty = '---\nname: Борода\nphone: 8-999-123-45-67\n---\n## Услуги\n:::services\ntitle: Стрижка\n\n:::hours\nпн–вс: 10:00–20:00\n:::\n'
    const { model, calls } = scripted(dirty)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
    const { model: before, autofix } = result.attempts[0]
    expect(before.output).toBe(dirty)
    expect(before.counts).toMatchObject({ errors: 1 })
    expect(before.counts.warnings).toBeGreaterThanOrEqual(1)
    expect(autofix!.counts).toMatchObject({ errors: 0, warnings: 0 })
    expect(autofix!.fixedCodes).toEqual(expect.arrayContaining(['nested-fence', 'phone-format']))
    expect(autofix!.output).toContain('phone: +7 999 123-45-67')
  })

  it('заглушку вместо названия не вставляет — просит нейросеть', async () => {
    const { model, calls } = scripted('---\nphone: +7 999 123-45-67\n---\n', VALID)
    const result = await run(model)
    expect(result.attempts[0].autofix!.output).not.toContain('Моё название')
    expect(errors(result.attempts[0])).toBe(1)
    expect(request(calls, 1)).toContain('В шапке нет названия')
    expect(result.outcome).toBe('valid')
  })

  it('запрос на исправление: описание, документ после автоисправлений и ошибки с номерами строк', async () => {
    const withFixable = UNKNOWN_BLOCK.replace('+7 999 123-45-67', '89991234567')
    const { model, calls } = scripted(withFixable, VALID)
    const result = await run(model)
    expect(result.outcome).toBe('valid')
    expect(result.attempts.map(errors)).toEqual([1, 0])

    const text = request(calls, 1)
    expect(calls[1].messages[0].role).toBe('system')
    expect(text).toBe(result.attempts[1].request)
    expect(text).toContain(DESCRIPTION)
    // Документ — уже с исправленным телефоном, чтобы модель не откатила исправление
    expect(text).toContain(UNKNOWN_BLOCK)
    expect(text).toMatch(/Ошибки — исправь обязательно:\n- строка 7 \(«:::prices»\): .*prices/)
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
    expect(result.attempts.map((a) => [a.attempt, errors(a)])).toEqual([[1, 3], [2, 2], [3, 1]])
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
    expect(attempt).toMatchObject({ reachedModel: true, finishReason: 'stop', tokensIn: 5000, tokensOut: 300, latencyMs: 2500 })
  })
})

describe('generateSite: предупреждения', () => {
  it('«нехватка данных» не уходит нейросети никогда — иначе она выдумает телефон', async () => {
    const noContacts = '---\nname: Борода\naddress: ул. Ленина, 10\n---\n\n## Где мы\n:::map\n:::\n'
    const { model, calls } = scripted(noContacts)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
    const { counts, diagnostics } = result.best!.autofix!
    expect(diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(['no-contacts', 'address-without-city']))
    expect(counts.missingData).toBeGreaterThanOrEqual(2)
  })

  it('«нехватка данных» не попадает и в запрос на исправление ошибок', async () => {
    const broken = '---\nname: Борода\naddress: ул. Ленина, 10\n---\n\n## Цены\n:::prices\n:::\n'
    const { model, calls } = scripted(broken, VALID)
    await run(model)
    // Описание пользователя в запросе есть всегда — смотрим только на список замечаний
    const issues = request(calls, 1).split('Ошибки — исправь обязательно:')[1]
    expect(issues).toContain(':::prices')
    expect(issues).not.toMatch(/телефон|мессенджер|город/i)
  })

  it('ошибок нет, исправимые предупреждения есть — одна попытка на них', async () => {
    const { model, calls } = scripted(WITH_FIXABLE_WARNING, VALID)
    const result = await run(model)
    expect(calls).toHaveLength(2)
    const text = request(calls, 1)
    expect(text).toContain('Ошибок нет.')
    expect(text).toMatch(/Желательно исправить:\n- строка 10 \(«master: Иван»\): .*неизвестное поле «master»/)
    expect(text).toMatch(/не добавляй фактов/i)
    expect(result.outcome).toBe('valid')
    expect(result.best).toBe(result.attempts[1])
  })

  it('на предупреждения — не больше одной попытки; при равенстве лучшая — первая', async () => {
    const { model, calls } = scripted(WITH_FIXABLE_WARNING)
    const result = await run(model)
    expect(calls).toHaveLength(2)
    expect(result.outcome).toBe('valid')
    expect(result.best).toBe(result.attempts[0])
  })

  it('попытка на предупреждения внесла ошибку — остаётся документ без ошибок', async () => {
    const result = await run(scripted(WITH_FIXABLE_WARNING, UNKNOWN_BLOCK).model)
    expect(result.outcome).toBe('valid')
    expect(result.best).toBe(result.attempts[0])
  })

  it('последняя разрешённая попытка без ошибок — на предупреждения не тратится', async () => {
    const { model, calls } = scripted(WITH_FIXABLE_WARNING)
    const result = await run(model, { maxAttempts: 1 })
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('valid')
  })

  it('в запросе сначала ошибки, затем «желательно исправить»', async () => {
    const both = WITH_FIXABLE_WARNING.replace(':::services', ':::prices').replace('\n:::\n', '\n:::\n\n:::services\ntitle: B\nfoo: 1\n:::\n')
    const { model, calls } = scripted(both, VALID)
    await run(model)
    const text = request(calls, 1)
    expect(text.indexOf('Ошибки — исправь обязательно')).toBeGreaterThan(0)
    expect(text.indexOf('Желательно исправить')).toBeGreaterThan(text.indexOf('Ошибки — исправь обязательно'))
  })
})

describe('generateSite: особые исходы — каждое обращение к нейросети записывается', () => {
  it('blacklist — отказ фильтра, документа нет', async () => {
    const refusal = 'Не люблю менять тему разговора, но вот сейчас тот самый случай.'
    const { model, calls } = scripted({ text: refusal, finishReason: 'blacklist' })
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('blacklist')
    expect(result.best).toBeNull()
    expect(result.attempts[0]).toMatchObject({ reachedModel: true, finishReason: 'blacklist', model: { output: refusal }, autofix: null })
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/другими словами/)
  })

  it('blacklist на исправлении — остаётся лучшее из готового', async () => {
    const result = await run(scripted(UNKNOWN_BLOCK, { text: '…', finishReason: 'blacklist' }).model)
    expect(result.outcome).toBe('blacklist')
    expect(result.attempts).toHaveLength(2)
    expect(result.best).toBe(result.attempts[0])
  })

  it('length — ответ обрезан: остановка, документ показывается с предупреждением', async () => {
    const cut = VALID.slice(0, VALID.indexOf('price'))
    const { model, calls } = scripted({ text: cut, finishReason: 'length' }, VALID)
    const result = await run(model)
    expect(calls).toHaveLength(1)
    expect(result.outcome).toBe('length')
    // Незакрытый блок закрыло автоисправление
    expect(errors(result.best!)).toBe(0)
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

  it('занято на первой попытке — запрос до модели не дошёл, документа нет', async () => {
    const result = await run(scripted(new ModelNotReachedError('Chat 429', 'busy')).model)
    expect(result.outcome).toBe('busy')
    expect(result.best).toBeNull()
    expect(result.attempts).toEqual([expect.objectContaining({ attempt: 1, reachedModel: false, error: 'Chat 429', autofix: null })])
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/занята/)
  })

  it('ошибка сети после отправки — попытка записана как дошедшая до модели', async () => {
    const result = await run(scripted(new Error('connection reset')).model)
    expect(result.outcome).toBe('model-error')
    expect(result.attempts).toEqual([expect.objectContaining({ reachedModel: true, error: 'connection reset' })])
  })

  it('ошибка на повторной попытке — остаётся лучшее из готового', async () => {
    const result = await run(scripted(UNKNOWN_BLOCK, new Error('Chat 500')).model)
    expect(result.outcome).toBe('model-error')
    expect(result.attempts).toHaveLength(2)
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
    expect(result.attempts[1]).toMatchObject({ reachedModel: true, error: 'timeout', latencyMs: 70_000 })
    expect(result.best).toBe(result.attempts[0])
  })
})

describe('generateSite: json', () => {
  const example = JSON.stringify(EXAMPLE_JSON)
  const runJson = (model: ChatModel) => generateSite({ description: DESCRIPTION, mode: 'json', model, deadlineMs: 60_000 })

  it('JSON по схеме → разметка через serialize', async () => {
    const { model, calls } = scripted(`\`\`\`json\n${example}\n\`\`\``)
    const result = await runJson(model)
    expect(calls[0].messages[0].content).toBe(buildSystemPrompt({ mode: 'json' }))
    expect(result.outcome).toBe('valid')
    expect(result.best!.model.output).toBe(`\`\`\`json\n${example}\n\`\`\``)
    expect(result.best!.autofix!.output).toBe(serialize(fromJson(EXAMPLE_JSON)))
  })

  it('лишнее поле — ошибка схемы с путём, нейросеть исправляет', async () => {
    const extra = JSON.stringify({ ...EXAMPLE_JSON, sections: [{ type: 'map', title: 'Где мы', floor: 2 }] })
    const { model, calls } = scripted(extra, example)
    const result = await runJson(model)
    expect(result.attempts[0]).toMatchObject({ autofix: null, model: { counts: { errors: 1 } } })
    expect(result.attempts[0].model.diagnostics[0].code).toBe('json-schema')
    const text = request(calls, 1)
    expect(text).toContain(DESCRIPTION)
    expect(text).toContain(extra)
    expect(text).toMatch(/- sections\[0\]: .*floor/)
    expect(text).toMatch(/Верни JSON целиком/)
    expect(result.outcome).toBe('valid')
  })

  it('от «не JSON» к ошибкам схемы — это прогресс', async () => {
    const twoIssues = JSON.stringify({ ...EXAMPLE_JSON, theme: 'neon', accent: 'red' })
    const { model, calls } = scripted('{"name": ', twoIssues, example)
    const result = await runJson(model)
    expect(calls).toHaveLength(3)
    expect(result.attempts.map((a) => (a.autofix ? null : a.model.diagnostics[0].code))).toEqual(['json-syntax', 'json-schema', null])
    expect(result.outcome).toBe('valid')
  })

  it('ни одного разобранного JSON — документа нет, но попытки записаны', async () => {
    const result = await runJson(scripted('не знаю').model)
    expect(result.outcome).toBe('no-progress')
    expect(result.best).toBeNull()
    expect(result.attempts).toHaveLength(2)
    expect(result.attempts[0].model.output).toBe('не знаю')
    expect(outcomeMessage(result.outcome, result.best)).toMatch(/Не получилось/)
  })
})
