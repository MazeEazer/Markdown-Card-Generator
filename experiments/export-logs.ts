// Выгрузка эксперимента 1: строки generation_logs по run_id из runs.jsonl → CSV и пакет для ручной разметки.
// Журнал читается от имени тестового аккаунта (experiments/.env.local, см. common.ts): RLS отдаёт только его строки.
//
//   node experiments/export-logs.ts                    # из experiments/results/exp1/runs.jsonl туда же
//   node experiments/export-logs.ts --out папка        # другой прогон (например, проверка на заглушке)
//
// Пишет в папку прогона:
//   logs.jsonl            — строки журнала как есть (архив: пересчёт без сети)
//   final.csv             — строка на запуск
//   metrics.csv           — по «модель × режим»
//   metrics-by-tag.csv    — по «модель × режим × тег» (теги сложности и niche:<ниша>)
//   annotation/           — 16 описаний из annotation-exp1.json, первый повтор, все модели и режимы:
//                           <id>.md на описание и sheet.csv для разметки (существующий sheet.csv не перезаписывается)
//
// Определения (по журналу, src/dsl/generate.ts → logRows):
//   валиден              — итоговая строка (is_final) — документ после обработки без ошибок (stage autofix, errors_count 0)
//   валиден с 1-й попытки — документ первой попытки после обработки без ошибок
//   ответ модели валиден — сам ответ модели первой попытки без ошибок, до автоисправлений (насколько модель справляется сама)
//   спасён обработкой    — валиден, но ответ модели в итоговой попытке был с ошибками: их убрали автоисправления
//   согласованность      — по описаниям, где есть ≥ 2 повтора: одинаковая валидность во всех повторах; одинаковый
//                          итоговый документ; среднее попарное сходство документов (Жаккар по непустым строкам)

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  DEFAULT_OUT,
  DEFAULT_PROMPTS,
  EXP_MODELS,
  EXP_MODES,
  EXPERIMENTS,
  fail,
  FROZEN_PIPELINE,
  loadConfig,
  type PromptItem,
  readJson,
  readPrompts,
  readRuns,
  type RunRecord,
  Session,
  sleep,
  toCsv,
} from './common.ts'

const OUTCOMES = ['valid', 'max-attempts', 'no-progress', 'deadline', 'blacklist', 'length', 'busy', 'model-error']
/** run_id в одном запросе: строка адреса остаётся короткой, строк в ответе — меньше предела PostgREST (1000) */
const BATCH = 40

const { values: args } = parseArgs({
  options: {
    out: { type: 'string' },
    prompts: { type: 'string' },
    annotation: { type: 'string' },
  },
})

const outDir = args.out ?? DEFAULT_OUT
const runs = readRuns(join(outDir, 'runs.jsonl'))
if (!runs.length) fail(`нет запусков в ${join(outDir, 'runs.jsonl')} — сначала run-generation.ts`)
const prompts = new Map(readPrompts(args.prompts ?? DEFAULT_PROMPTS).map((p) => [p.id, p]))
const annotationIds = readJson<{ ids: string[] }>(args.annotation ?? join(EXPERIMENTS, 'annotation-exp1.json')).ids

interface LogRow {
  run_id: string
  user_id: string
  model: string
  mode: string
  business: string | null
  prompt: string
  prompt_version: string
  prompt_base_version: string | null
  pipeline_version: string | null
  attempt: number
  stage: 'model' | 'autofix'
  output: string | null
  errors_count: number
  warnings_count: number
  missing_data_count: number
  fixed_codes: string[]
  finish_reason: string | null
  error: string | null
  tokens_in: number | null
  tokens_out: number | null
  latency_ms: number | null
  outcome: string
  is_final: boolean
}

// --- журнал
const session = new Session(loadConfig())
await session.signIn()

async function fetchLogs(runIds: string[]): Promise<LogRow[]> {
  const url = `${session.config.url}/rest/v1/generation_logs?select=*&run_id=in.(${runIds.join(',')})&order=run_id,attempt,stage`
  for (let retry = 0; ; retry++) {
    const res = await fetch(url, {
      headers: { apikey: session.config.anonKey, Authorization: `Bearer ${await session.token()}` },
      signal: AbortSignal.timeout(60_000),
    }).catch((error: Error) => error)
    if (res instanceof Response && res.ok) return (await res.json()) as LogRow[]
    if (res instanceof Response && res.status === 401 && retry === 0) {
      await session.refresh()
      continue
    }
    if (retry >= 2) fail(`журнал не читается: ${res instanceof Response ? `HTTP ${res.status} ${await res.text()}` : res.message}`)
    await sleep(5000)
  }
}

const unique = [...new Set(runs.map((r) => r.runId))]
const logs: LogRow[] = []
for (let i = 0; i < unique.length; i += BATCH) logs.push(...(await fetchLogs(unique.slice(i, i + BATCH))))
writeFileSync(join(outDir, 'logs.jsonl'), logs.map((row) => JSON.stringify(row)).join('\n') + '\n')
console.log(`Запусков в runs.jsonl: ${runs.length}, строк журнала: ${logs.length}`)

const byRun = Map.groupBy(logs, (row) => row.run_id)
const missing = runs.filter((r) => !byRun.has(r.runId))
if (missing.length) {
  console.warn(`Внимание: у ${missing.length} запусков нет строк в журнале (другой аккаунт или журнал не записан): ` +
    missing.slice(0, 5).map((r) => r.key).join(', '))
}

// --- строка на запуск
interface Run {
  record: RunRecord
  prompt: PromptItem | undefined
  rows: LogRow[]
  final: LogRow
  finalModel: LogRow
  valid: boolean
  firstValid: boolean
  firstModelValid: boolean
  rescued: boolean
  attempts: number
  tokensIn: number
  tokensOut: number
  doc: string
}

const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0)

const analysed: Run[] = runs.flatMap((record) => {
  const rows = byRun.get(record.runId)
  if (!rows) return []
  const final = rows.find((row) => row.is_final)
  if (!final) {
    console.warn(`Внимание: у запуска ${record.key} нет итоговой строки — пропущен`)
    return []
  }
  const modelRows = rows.filter((row) => row.stage === 'model')
  const at = (attempt: number, stage: LogRow['stage']) => rows.find((row) => row.attempt === attempt && row.stage === stage)
  const finalModel = at(final.attempt, 'model') ?? final
  const valid = final.stage === 'autofix' && final.errors_count === 0
  return [{
    record,
    prompt: prompts.get(record.id),
    rows,
    final,
    finalModel,
    valid,
    firstValid: at(1, 'autofix')?.errors_count === 0,
    firstModelValid: at(1, 'model')?.errors_count === 0,
    rescued: valid && finalModel.errors_count > 0,
    attempts: Math.max(...rows.map((row) => row.attempt)),
    tokensIn: sum(modelRows.map((row) => row.tokens_in)),
    tokensOut: sum(modelRows.map((row) => row.tokens_out)),
    doc: final.stage === 'autofix' ? final.output ?? '' : '',
  }]
})

const yes = (value: boolean) => (value ? 1 : 0)
const tagsOf = (run: Run) => (run.prompt?.tags ?? []).filter((tag) => !tag.startsWith('author:'))

writeFileSync(join(outDir, 'final.csv'), toCsv(analysed.map((run) => ({
  model: run.record.model,
  mode: run.record.mode,
  rep: run.record.rep,
  id: run.record.id,
  business: run.record.business ?? '',
  tags: tagsOf(run),
  run_id: run.record.runId,
  outcome: run.final.outcome,
  valid: yes(run.valid),
  first_attempt_valid: yes(run.firstValid),
  first_model_valid: yes(run.firstModelValid),
  rescued_by_autofix: yes(run.rescued),
  attempts: run.attempts,
  final_errors: run.final.errors_count,
  final_warnings: run.final.warnings_count,
  final_missing_data: run.final.missing_data_count,
  fixed_codes: run.final.fixed_codes,
  finish_reason: run.finalModel.finish_reason ?? '',
  tokens_in: run.tokensIn,
  tokens_out: run.tokensOut,
  model_latency_s: sum(run.rows.map((row) => row.latency_ms)) / 1000,
  seconds: run.record.seconds,
  retries: run.record.retries.length,
  prompt_version: run.final.prompt_version,
  prompt_base_version: run.final.prompt_base_version ?? '',
  pipeline_version: run.final.pipeline_version ?? '',
  started_at: run.record.startedAt,
}))))

// --- метрики
function quantile(values: number[], q: number): number {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]
}
const mean = (values: number[]) => (values.length ? sum(values) / values.length : NaN)
const share = (runs: Run[], pick: (run: Run) => boolean) => round(mean(runs.map((run) => yes(pick(run)))))
const round = (value: number, digits = 3) => (Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : '')

const lines = (doc: string) => new Set(doc.split('\n').map((line) => line.trim()).filter(Boolean))
function jaccard(a: string, b: string): number {
  const [x, y] = [lines(a), lines(b)]
  const union = new Set([...x, ...y]).size
  return union ? [...x].filter((line) => y.has(line)).length / union : 1
}
const hash = (text: string) => createHash('sha256').update(text).digest('hex')

function consistency(group: Run[]) {
  const repeated = [...Map.groupBy(group, (run) => run.record.id).values()].filter((reps) => reps.length >= 2)
  const pairs = repeated.flatMap((reps) => reps.flatMap((a, i) => reps.slice(i + 1).map((b) => jaccard(a.doc, b.doc))))
  return {
    repeat_descriptions: repeated.length,
    repeat_same_validity: round(mean(repeated.map((reps) => yes(new Set(reps.map((r) => r.valid)).size === 1)))),
    repeat_identical_doc: round(mean(repeated.map((reps) => yes(new Set(reps.map((r) => hash(r.doc))).size === 1)))),
    repeat_line_jaccard: round(mean(pairs)),
  }
}

const versions = (group: Run[], pick: (row: LogRow) => string | null) => [...new Set(group.map((run) => pick(run.final) ?? '—'))]

function metrics(group: Run[]) {
  const seconds = group.map((run) => run.record.seconds)
  const pipelines = versions(group, (row) => row.pipeline_version)
  const bases = versions(group, (row) => row.prompt_base_version)
  return {
    runs: group.length,
    valid: group.filter((run) => run.valid).length,
    valid_share: share(group, (run) => run.valid),
    first_attempt_valid_share: share(group, (run) => run.firstValid),
    first_model_valid_share: share(group, (run) => run.firstModelValid),
    rescued_by_autofix_share: share(group, (run) => run.rescued),
    attempts_mean: round(mean(group.map((run) => run.attempts))),
    ...consistency(group),
    tokens_in_mean: round(mean(group.map((run) => run.tokensIn)), 0),
    tokens_out_mean: round(mean(group.map((run) => run.tokensOut)), 0),
    tokens_total: sum(group.map((run) => run.tokensIn + run.tokensOut)),
    seconds_median: round(quantile(seconds, 0.5), 1),
    seconds_p90: round(quantile(seconds, 0.9), 1),
    ...Object.fromEntries(OUTCOMES.map((o) => [`outcome_${o}`, group.filter((run) => run.final.outcome === o).length])),
    pipeline_version: pipelines,
    prompt_base_version: bases,
    versions_mixed: yes(pipelines.length > 1 || bases.length > 1),
  }
}

const order = (list: string[], value: string) => (list.includes(value) ? list.indexOf(value) : list.length)
const sorted = [...analysed].sort((a, b) =>
  order(EXP_MODELS, a.record.model) - order(EXP_MODELS, b.record.model) ||
  order(EXP_MODES, a.record.mode) - order(EXP_MODES, b.record.mode))
const groups = Map.groupBy(sorted, (run) => `${run.record.model}|${run.record.mode}`)

const metricRows = [...groups].map(([key, group]) => {
  const [model, mode] = key.split('|')
  return { model, mode, ...metrics(group) }
})
writeFileSync(join(outDir, 'metrics.csv'), toCsv(metricRows))

const tagRows = [...groups].flatMap(([key, group]) => {
  const [model, mode] = key.split('|')
  const byTag = new Map<string, Run[]>()
  for (const run of group) {
    for (const tag of [...tagsOf(run), `niche:${run.record.business ?? 'none'}`]) byTag.set(tag, [...(byTag.get(tag) ?? []), run])
  }
  return [...byTag].sort(([a], [b]) => a.localeCompare(b)).map(([tag, runs]) => {
    const m = metrics(runs)
    return {
      model, mode, tag, runs: m.runs, valid_share: m.valid_share, first_attempt_valid_share: m.first_attempt_valid_share,
      first_model_valid_share: m.first_model_valid_share, rescued_by_autofix_share: m.rescued_by_autofix_share,
      attempts_mean: m.attempts_mean, seconds_median: m.seconds_median,
    }
  })
})
writeFileSync(join(outDir, 'metrics-by-tag.csv'), toCsv(tagRows))

// --- версии: эксперимент сравним, только если обработка и промпт режима одни на весь прогон
const allPipelines = versions(analysed, (row) => row.pipeline_version)
if (allPipelines.length > 1 || allPipelines[0] !== FROZEN_PIPELINE) {
  console.warn(`Внимание: версии обработки в прогоне — ${allPipelines.join(', ')}; ожидалась одна, ${FROZEN_PIPELINE}. Прогон смешан`)
}
for (const mode of EXP_MODES) {
  const bases = versions(analysed.filter((run) => run.record.mode === mode), (row) => row.prompt_base_version)
  if (bases.length > 1) console.warn(`Внимание: в режиме ${mode} несколько версий промпта: ${bases.join(', ')}. Прогон смешан`)
}

// --- пакет для ручной разметки
const annotationDir = join(outDir, 'annotation')
mkdirSync(annotationDir, { recursive: true })
/** Ограждение длиннее любой последовательности ` в тексте — ответ модели сам бывает в ```. */
const fence = (text: string) => '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)))
const block = (text: string, lang = '') => {
  const f = fence(text)
  return `${f}${lang}\n${text.replace(/\n$/, '')}\n${f}`
}

const sheet: Record<string, unknown>[] = []
for (const id of annotationIds) {
  const prompt = prompts.get(id)
  const first = sorted.filter((run) => run.record.id === id && run.record.rep === 1)
  if (!first.length) {
    console.warn(`Внимание: для разметки нет запусков ${id} (повтор 1)`)
    continue
  }
  const parts = [
    `# ${id}`,
    '',
    `Ниша: ${first[0].record.business ?? 'не выбрана'}. Теги: ${prompt ? tagsOf(first[0]).join(', ') || '—' : '—'}`,
    '',
    '## Описание (как в generation_logs.prompt)',
    '',
    block(first[0].final.prompt),
    '',
    '## Что проверить (check)',
    '',
    prompt?.check ?? '—',
  ]
  for (const run of first) {
    parts.push(
      '',
      `## ${run.record.model}, ${run.record.mode}`,
      '',
      `run_id \`${run.record.runId}\` · итог ${run.final.outcome} · попыток ${run.attempts} · ` +
        `автоисправления: ${run.final.fixed_codes.join(', ') || '—'}`,
      '',
      `### Ответ модели (итоговая попытка ${run.final.attempt}) — считаем «выдумано»`,
      '',
      block(run.finalModel.output ?? '(ответа нет)'),
      '',
      '### Что дошло до пользователя — считаем «дошло»',
      '',
      run.final.stage === 'autofix' ? block(run.final.output ?? '', 'markdown') : '(документ не получился — пользователь видит сообщение об ошибке)',
    )
    sheet.push({
      id, business: run.record.business ?? '', model: run.record.model, mode: run.record.mode, run_id: run.record.runId,
      outcome: run.final.outcome, attempts: run.attempts, completeness_1_5: '', invented_model: '', invented_reached: '',
      misleading: '', inaccurate: '', false_deletions: '', rule_violations: '', site_language: '', details: '',
      annotator: '', author_check: '',
    })
  }
  writeFileSync(join(annotationDir, `${id}.md`), parts.join('\n') + '\n')
}

const sheetPath = join(annotationDir, 'sheet.csv')
const sheetTarget = existsSync(sheetPath) ? join(annotationDir, 'sheet.new.csv') : sheetPath
writeFileSync(sheetTarget, toCsv(sheet))
if (sheetTarget !== sheetPath) console.warn('Внимание: annotation/sheet.csv уже есть (разметка не затирается) — новый лист в sheet.new.csv')
writeFileSync(join(annotationDir, 'README.md'), `# Ручная разметка эксперимента 1

Методика — PLAN.md, этап 5, «Заметки для ВКР» (что считается выдуманным) и протокол эксперимента 1 (этап 7).
Сверять с текстом описания из файла (он же — \`generation_logs.prompt\`), а не с памятью о нём.
Первый проход делает Claude (annotator = claude), автор проверяет (author_check = ok или что исправлено).

Колонки sheet.csv:
- completeness_1_5 — полнота переноса данных из описания: 5 — всё, 1 — почти ничего
- invented_model — выдуманных фактов в ответе модели (итоговая попытка, до обработки)
- invented_reached — из них дошло до пользователя (документ после обработки)
- misleading — ошибок, вводящих клиента в заблуждение (в дошедшем документе): неверные день, часы, цена у услуги, контакт не в том мессенджере
- inaccurate — неточных переносов, которые клиента не подведут
- false_deletions — настоящих данных из описания, удалённых обработкой
- rule_violations — нарушений правил промпта (например, вопросы и ответы без вопросов в описании)
- site_language — язык сайта (ru / en)
- details — перечень: каждый факт коротко, с пометкой категории
`)

console.log(`Готово: final.csv, metrics.csv, metrics-by-tag.csv, logs.jsonl, annotation/ (${annotationIds.length} описаний) — в ${outDir}`)
