// Журнал событий редактора для эксперимента: подсказки, справка, ошибки валидатора и их исправление.
// Куда отправлять — решает вызывающий код (send); здесь только что и когда писать.
import { completionStatus, currentCompletions, pickedCompletion } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { Diagnostic, Severity } from '../dsl/types'
import { hoverListener } from './hover'
import { fixApplied } from './lint'

export type EditorEventName =
  | 'completion_shown'
  | 'completion_accepted'
  | 'hover_shown'
  | 'diagnostic_appeared'
  | 'diagnostic_resolved'
  | 'fix_applied'
  | 'block_inserted'

export interface EditorEvent {
  event: EditorEventName
  code: string | null
  detail: Record<string, unknown>
  occurred_at: string
}

export interface EditorLogger {
  log: (event: EditorEventName, code?: string | null, detail?: Record<string, unknown>) => void
  /** Новый список диагностик после правки: появившиеся и исчезнувшие ошибки пишутся после паузы в наборе */
  diagnostics: (list: Diagnostic[]) => void
  /** Текст заменён целиком (открыли сайт, загрузили пример): это не «ошибки появились», а новая точка отсчёта */
  resetDiagnostics: (list: Diagnostic[]) => void
  /** Исправление нажато — исчезновение этой ошибки запишем как «исправлена кнопкой» */
  noteFix: (code: string) => void
  /** Отправить накопленное сейчас (уход со страницы) и остановить таймеры */
  flush: () => void
}

/** Ничего не пишет — когда логирование выключено. */
export const NO_LOGGER: EditorLogger = {
  log: () => {},
  diagnostics: () => {},
  resetDiagnostics: () => {},
  noteFix: () => {},
  flush: () => {},
}

type Counts = Map<string, { count: number; severity: Severity }>

/** Сколько раз встречается каждый код правила. Позиции не сравниваем: при правке текста они сдвигаются. */
export function diagnosticCounts(list: Diagnostic[]): Counts {
  const counts: Counts = new Map()
  for (const d of list) {
    const entry = counts.get(d.code)
    counts.set(d.code, { count: (entry?.count ?? 0) + 1, severity: d.severity })
  }
  return counts
}

export interface DiagnosticChange {
  code: string
  severity: Severity
  /** На сколько штук стало больше (appeared) или меньше (resolved) */
  count: number
}

export function diffDiagnostics(before: Counts, after: Counts): { appeared: DiagnosticChange[]; resolved: DiagnosticChange[] } {
  const appeared: DiagnosticChange[] = []
  const resolved: DiagnosticChange[] = []
  for (const [code, { count, severity }] of after) {
    const was = before.get(code)?.count ?? 0
    if (count > was) appeared.push({ code, severity, count: count - was })
  }
  for (const [code, { count, severity }] of before) {
    const now = after.get(code)?.count ?? 0
    if (now < count) resolved.push({ code, severity, count: count - now })
  }
  return { appeared, resolved }
}

export interface LoggerOptions {
  /** Пауза в наборе, после которой сравниваем ошибки: промежуточные состояния при наборе не пишем */
  settleMs?: number
  /** Как часто отправлять накопленное */
  flushMs?: number
  /** Отправить сразу, если накопилось столько */
  maxBatch?: number
  now?: () => Date
}

export function createLogger(send: (events: EditorEvent[]) => void, options: LoggerOptions = {}): EditorLogger {
  const { settleMs = 1500, flushMs = 5000, maxBatch = 20, now = () => new Date() } = options
  let queue: EditorEvent[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let baseline: Counts | null = null
  let pending: Diagnostic[] | null = null
  const fixed = new Set<string>()

  const flush = () => {
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = null
    if (queue.length === 0) return
    const batch = queue
    queue = []
    send(batch)
  }

  const log: EditorLogger['log'] = (event, code = null, detail = {}) => {
    queue.push({ event, code, detail, occurred_at: now().toISOString() })
    if (queue.length >= maxBatch) flush()
    else flushTimer ??= setTimeout(flush, flushMs)
  }

  const settle = () => {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = null
    if (!pending) return
    const next = diagnosticCounts(pending)
    pending = null
    if (baseline) {
      const { appeared, resolved } = diffDiagnostics(baseline, next)
      for (const { code, severity, count } of appeared) log('diagnostic_appeared', code, { severity, count })
      for (const { code, severity, count } of resolved) {
        log('diagnostic_resolved', code, { severity, count, by: fixed.has(code) ? 'fix' : 'edit' })
      }
    }
    baseline = next
    fixed.clear()
  }

  return {
    log,
    diagnostics: (list) => {
      // Самый первый список — точка отсчёта: ошибки, которые уже были в тексте, не «появились»
      if (!baseline && !pending) {
        baseline = diagnosticCounts(list)
        return
      }
      pending = list
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(settle, settleMs)
    },
    resetDiagnostics: (list) => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = null
      pending = null
      fixed.clear()
      baseline = diagnosticCounts(list)
    },
    noteFix: (code) => fixed.add(code),
    flush: () => {
      settle()
      flush()
    },
  }
}

/** События, которые видит сам CodeMirror: список подсказок открылся, вариант выбран, справка, исправление. */
export function editorEvents(logger: EditorLogger): Extension {
  return [
    EditorView.updateListener.of((update) => {
      const was = completionStatus(update.startState)
      const is = completionStatus(update.state)
      if (is === 'active' && was !== 'active') {
        const options = currentCompletions(update.state)
        logger.log('completion_shown', options[0]?.type ?? null, { options: options.length })
      }
      for (const tr of update.transactions) {
        const picked = tr.annotation(pickedCompletion)
        if (picked) logger.log('completion_accepted', picked.label, { kind: picked.type ?? null })
        const fix = tr.annotation(fixApplied)
        if (fix) {
          logger.noteFix(fix.code)
          logger.log('fix_applied', fix.code, { source: fix.source })
        }
      }
    }),
    hoverListener.of((code, kind) => logger.log('hover_shown', code, { kind })),
  ]
}
