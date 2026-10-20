// Прогон эксперимента 1: описания × модели × режимы × повторы через задеплоенную функцию generate-site.
// Замена run-step8.sh: вход по паролю тестового аккаунта (experiments/.env.local, см. common.ts),
// токен обновляется сам, прогон можно прерывать и продолжать.
//
//   node experiments/run-generation.ts --dry-run                 # план прогона без сети
//   node experiments/run-generation.ts                           # всё: 5 моделей × 2 повтора × 48 × 2 режима
//   node experiments/run-generation.ts --models GigaChat-2-Pro --reps 1 --only b01-clean,t03-messenger-only
//
// Параметры: --models, --modes, --only (через запятую), --reps N, --prompts файл, --out папка (по умолчанию
// experiments/results/exp1 — в .gitignore), --dry-run.
// Порядок моделей — как в --models (по умолчанию 2-Pro, 2-Max, 3-Lightning, 3-Pro, 3-Ultra); --reverse — обратный.
// Протокол: повтор 2 — в обратном порядке, чтобы дрейф GigaChat во времени не совпадал с моделью:
//   повтор 1: --reps 1    повтор 2: --reps 2 --reverse    (повтор 3 отменён — PLAN.md, протокол эксперимента 1)
// Порядок строго последовательный (у физлица в GigaChat один поток): модель → повтор → описание → режим.
// Каждый завершённый запуск сразу дописывается в <out>/runs.jsonl; при повторном старте готовые пропускаются.
// Занято, 5xx, сеть — пауза и повтор; limit, 401, 400 — остановка (продолжить можно тем же запуском).
// Технический сбой внутри функции (ответ 200, но GigaChat ответил 5xx и т. п. — common.ts → technicalFailure) записывается
// в runs.jsonl с полем failure и перезапускается; старые записи model-error/busy без failure проверяются по журналу при старте.
// Ctrl+C — остановка после текущего запуска, второй Ctrl+C — сразу.
// EXP_PAUSE_SCALE — множитель пауз (для проверки на заглушке: 0.001).

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import {
  DEFAULT_OUT,
  DEFAULT_PROMPTS,
  EXP_MODELS,
  EXP_MODES,
  EXP_REPS,
  fail,
  FAILURE_OUTCOMES,
  fetchLogs,
  loadConfig,
  type PromptItem,
  readPrompts,
  readRuns,
  ROOT,
  type RunRecord,
  runKey,
  Session,
  sleep,
  technicalFailure,
} from './common.ts'

/** Паузы перед повтором, с: «занято» — ждём, пока GigaChat освободится; 5xx и сеть — реже и дольше. */
const BUSY_PAUSES = [20, 40, 60, 120, 120, 300, 300, 600]
const ERROR_PAUSES = [15, 30, 60, 120, 300]
/** Функция отвечает за 150 с (PLAN.md, этап 5) — ждём чуть дольше. */
const REQUEST_TIMEOUT_MS = 180_000

const { values: args } = parseArgs({
  options: {
    models: { type: 'string' },
    modes: { type: 'string' },
    reps: { type: 'string' },
    only: { type: 'string' },
    prompts: { type: 'string' },
    out: { type: 'string' },
    reverse: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

const list = (value: string | undefined, all: string[]) => (value ? value.split(',').map((s) => s.trim()).filter(Boolean) : all)
const ordered = list(args.models, EXP_MODELS)
const models = args.reverse ? ordered.toReversed() : ordered
const modes = list(args.modes, EXP_MODES)
const reps = args.reps ? Number(args.reps) : EXP_REPS
if (!Number.isInteger(reps) || reps < 1) fail('--reps — целое число от 1')
for (const mode of modes) if (!EXP_MODES.includes(mode)) fail(`неизвестный режим ${mode}`)

const promptsPath = args.prompts ?? DEFAULT_PROMPTS
const allPrompts = readPrompts(promptsPath)
const onlyIds = list(args.only, [])
for (const id of onlyIds) if (!allPrompts.some((p) => p.id === id)) fail(`нет описания ${id} в ${promptsPath}`)
const prompts = onlyIds.length ? allPrompts.filter((p) => onlyIds.includes(p.id)) : allPrompts

const outDir = args.out ?? DEFAULT_OUT
const runsPath = join(outDir, 'runs.jsonl')
const pauseScale = Number(process.env.EXP_PAUSE_SCALE ?? 1)

interface Task {
  model: string
  rep: number
  prompt: PromptItem
  mode: string
  key: string
}

// Порядок: модель → повтор → описание → режим (весь первый повтор модели раньше второго)
const tasks: Task[] = models.flatMap((model) =>
  Array.from({ length: reps }, (_, i) => i + 1).flatMap((rep) =>
    prompts.flatMap((prompt) => modes.map((mode) => ({ model, rep, prompt, mode, key: runKey(model, rep, prompt.id, mode) }))),
  ),
)

const taskKeys = new Set(tasks.map((t) => t.key))
// Сбой (failure) — запуск не готов, его повторяем; при нескольких записях ключа берётся последняя без сбоя
const done = new Map(readRuns(runsPath).filter((r) => !r.failure).map((r) => [r.key, r]))
/** model-error и busy из прошлых запусков, ещё не проверенные по журналу: не сбой ли это */
const unchecked = [...done.values()].filter((r) => taskKeys.has(r.key) && FAILURE_OUTCOMES.includes(r.outcome) && r.failure === undefined)
// Описание поменяли после начала прогона — старые запуски уже не о том же тексте
for (const task of tasks) {
  const old = done.get(task.key)
  if (old && old.description !== task.prompt.description.trim()) {
    fail(`описание ${task.prompt.id} изменилось после запуска ${task.key}. Отложенную выборку во время прогона не меняют`)
  }
}
let todo = tasks.filter((t) => !done.has(t.key))

console.log(`Описаний: ${prompts.length}, модели: ${models.join(', ')}, режимы: ${modes.join(', ')}, повторов: ${reps}`)
console.log(`Запусков: ${tasks.length}, готово: ${tasks.length - todo.length}, осталось: ${todo.length}`)
const shown = relative(ROOT, runsPath)
console.log(`Журнал: ${shown.startsWith('..') ? runsPath : shown}`)

if (args['dry-run']) {
  if (unchecked.length) {
    console.log(`Исход model-error/busy у ${unchecked.length} готовых — при запуске проверятся по журналу; технический сбой перезапустится:`)
    for (const r of unchecked) console.log(`  ${r.key} (${r.outcome})`)
  }
  for (const t of todo.slice(0, 12)) console.log(`  ${t.key}`)
  if (todo.length > 12) console.log(`  … и ещё ${todo.length - 12}`)
  process.exit(0)
}
if (!todo.length && !unchecked.length) process.exit(0)

const session = new Session(loadConfig())
await session.signIn()
console.log(`Тестовый аккаунт: ${session.userId}`)

type FailureRow = { run_id: string; stage: string; error: string | null }
/** Причина технического сбоя запуска по журналу или null */
async function failureOf(runId: string, outcome: string): Promise<string | null> {
  if (!FAILURE_OUTCOMES.includes(outcome)) return null
  const rows = await fetchLogs<FailureRow>(session, [runId], 'run_id,stage,error')
  if (!rows.length) console.warn(`    Внимание: журнал запуска ${runId} пуст — сбой не проверить, считается результатом`)
  return technicalFailure(outcome, rows)
}

for (const record of unchecked) {
  const reason = await failureOf(record.runId, record.outcome)
  if (!reason) continue
  console.log(`Технический сбой в прошлом прогоне: ${record.key} — ${reason}. Запуск повторится (запись остаётся в runs.jsonl)`)
  done.delete(record.key)
}
todo = tasks.filter((t) => !done.has(t.key))
console.log(`К запуску: ${todo.length}`)
if (!todo.length) process.exit(0)
const otherUser = [...done.values()].find((r) => r.userId !== session.userId)
if (otherUser) console.warn(`Внимание: в runs.jsonl есть запуски другого аккаунта (${otherUser.userId}) — выгрузка их не увидит`)

mkdirSync(outDir, { recursive: true })
// Прошлый запуск прервали во время записи — новая строка не должна приклеиться к оборванной
if (existsSync(runsPath) && !readFileSync(runsPath, 'utf8').endsWith('\n')) appendFileSync(runsPath, '\n')
const functionUrl = `${session.config.url}/functions/v1/generate-site`

let stopRequested = false
process.on('SIGINT', () => {
  if (stopRequested) process.exit(130)
  stopRequested = true
  console.log('\nОстановка после текущего запуска (ещё раз Ctrl+C — сразу; готовые запуски сохранены)')
})

interface Reply {
  http: number | null
  body: Record<string, unknown>
  error?: string
}

async function callFunction(task: Task, token: string): Promise<Reply> {
  const request: Record<string, string> = { description: task.prompt.description, mode: task.mode, model: task.model }
  if (task.prompt.business) request.business = task.prompt.business
  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return { http: res.status, body }
  } catch (error) {
    return { http: null, body: {}, error: (error as Error).message }
  }
}

/** Один запуск с повторами. Возвращает запись или null — тогда прогон останавливается (причина уже напечатана). */
async function run(task: Task): Promise<RunRecord | null> {
  const retries: RunRecord['retries'] = []
  let busy = 0
  let errors = 0
  let refreshed = false
  for (;;) {
    const startedAt = new Date()
    const reply = await callFunction(task, await session.token())
    const seconds = (Date.now() - startedAt.getTime()) / 1000
    const message = String(reply.body.error ?? reply.error ?? '')

    if (reply.http === 200 && typeof reply.body.runId === 'string') {
      const record: RunRecord = {
        key: task.key,
        model: task.model,
        rep: task.rep,
        id: task.prompt.id,
        mode: task.mode,
        business: task.prompt.business ?? null,
        description: task.prompt.description.trim(),
        userId: session.userId,
        runId: reply.body.runId,
        outcome: String(reply.body.outcome),
        attempts: Number(reply.body.attempts),
        seconds: Math.round(seconds * 10) / 10,
        startedAt: startedAt.toISOString(),
        retries: [...retries],
      }
      const failure = await failureOf(record.runId, record.outcome)
      if (!failure) return record
      // Сбой GigaChat внутри функции: запись — для подсчёта сбоев, запуск — заново
      appendFileSync(runsPath, JSON.stringify({ ...record, failure }) + '\n')
      const pause = ERROR_PAUSES[errors++]
      retries.push({ http: 200, error: `технический сбой: ${failure}`, at: startedAt.toISOString() })
      if (pause === undefined) return stop(`после ${retries.length} повторов технический сбой не проходит (${failure})`)
      if (stopRequested) return null
      console.log(`    технический сбой (${failure}) — повтор через ${pause} с`)
      await sleep(pause * 1000 * pauseScale)
      continue
    }

    // Токен отозван раньше срока — один раз входим заново
    if (reply.http === 401 && !refreshed) {
      refreshed = true
      await session.refresh()
      continue
    }
    if (reply.http === 401) return stop(`сервер не принимает вход (401): ${message}`)
    if (reply.http === 429 || reply.body.code === 'limit') {
      return stop(`исчерпан суточный лимит: добавьте ${session.userId} в секрет GENERATION_UNLIMITED_USERS`)
    }
    if (reply.http === 400) return stop(`функция отклонила запрос (400): ${message}. Если «Неизвестная модель» — задеплойте generate-site`)

    const isBusy = reply.http === 503 && reply.body.code === 'busy'
    const retryable = isBusy || reply.http === null || reply.http >= 500
    if (!retryable) return stop(`неожиданный ответ HTTP ${reply.http}: ${message}`)

    const pauses = isBusy ? BUSY_PAUSES : ERROR_PAUSES
    const pause = pauses[isBusy ? busy++ : errors++]
    retries.push({ http: reply.http, error: message || 'нет ответа', at: startedAt.toISOString() })
    if (pause === undefined) return stop(`после ${retries.length} повторов нет ответа (${message || `HTTP ${reply.http}`})`)
    if (stopRequested) return null
    console.log(`    ${isBusy ? 'занято' : `HTTP ${reply.http ?? '—'}: ${message || 'нет ответа'}`} — повтор через ${pause} с`)
    await sleep(pause * 1000 * pauseScale)
  }
}

function stop(reason: string): null {
  console.error(`Остановка: ${reason}`)
  process.exitCode = 1
  return null
}

const startedAt = Date.now()
let completed = 0
for (const [i, task] of todo.entries()) {
  if (stopRequested) break
  const record = await run(task)
  if (!record) break
  appendFileSync(runsPath, JSON.stringify(record) + '\n')
  completed++
  const left = todo.length - i - 1
  const eta = Math.round((((Date.now() - startedAt) / completed) * left) / 60_000)
  const position = `[${tasks.length - todo.length + i + 1}/${tasks.length}]`
  console.log(
    `${position} ${task.model} п${task.rep} ${task.prompt.id.padEnd(28)} ${task.mode.padEnd(8)} ${record.outcome}, ` +
      `попыток ${record.attempts}, ${record.seconds} с${left ? `, осталось ~${eta} мин` : ''}`,
  )
}

console.log(`Сделано за этот запуск: ${completed}. Всего готово: ${tasks.length - todo.length + completed} из ${tasks.length}`)
if (completed < todo.length) console.log('Продолжить — та же команда: готовые запуски будут пропущены')
