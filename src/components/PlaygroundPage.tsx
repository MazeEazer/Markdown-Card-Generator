import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_MODE, DEFAULT_MODEL, DESCRIPTION_LIMITS, GENERATION_MODELS, type GenerationModel } from '../dsl/generate'
import type { PromptMode } from '../dsl/prompt'
import { BUSINESS_NAMES, BUSINESSES, type BusinessName } from '../dsl/schema/frontmatter'
import type { Site } from '../hooks/useSites'
import { type GenerateRequest, type GenerateResponse, type GenerateStatus, GenerateError } from '../lib/generateQueue'
import { generateSiteFromDescription } from '../lib/generateSite'
import { parseCardMarkdown } from '../lib/parser'
import { loadDraft, RUN_LOG_COLUMNS, type RunLogRow, type RunSummary, saveDraft, summarizeRun } from '../lib/playground'
import { supabase } from '../lib/supabase'
import { resolveTheme } from '../lib/themeEngine'
import { PreviewPane } from './PreviewPane'

interface PlaygroundPageProps {
  createSite: (name: string, markdown: string) => Promise<{ data: Site | null; error: unknown }>
  onSiteCreated: (site: Site) => void
  onBack: () => void
}

type SummaryState = 'loading' | 'unavailable' | RunSummary

interface Variant {
  id: number
  request: GenerateRequest
  /** Ответ функции; null, если запрос не дошёл (тогда error) */
  response: GenerateResponse | null
  error: string | null
  summary: SummaryState
  /** Сколько ждали ответа, мс (со стороны клиента) */
  waitedMs: number
}

const STATUS_TEXT: Record<GenerateStatus, string> = {
  generating: 'Нейросеть составляет сайт и проверяет его',
  queued: 'Нейросеть занята другим запросом — в очереди, повторим автоматически',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Журнал пишется функцией до ответа, но подстрахуемся от гонки: до трёх попыток. */
async function fetchSummary(runId: string, mode: PromptMode, markdown: string | null): Promise<SummaryState> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.from('generation_logs').select(RUN_LOG_COLUMNS).eq('run_id', runId)
    if (!error && data?.length) return summarizeRun(data as RunLogRow[], mode, markdown) ?? 'unavailable'
    await sleep(700)
  }
  return 'unavailable'
}

const siteName = (markdown: string) => parseCardMarkdown(markdown).data?.name?.trim() || 'Новый сайт'
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const field = 'w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
const ghostButton =
  'px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors'

/**
 * Песочница генерации: описание → generate-site без siteId (сайт не создаётся) → вариант с разметкой, превью и сводкой.
 * Варианты живут только на странице (в памяти); текст описания сохраняется в localStorage.
 */
export function PlaygroundPage({ createSite, onSiteCreated, onBack }: PlaygroundPageProps) {
  const [description, setDescription] = useState(loadDraft)
  const [business, setBusiness] = useState<BusinessName | ''>('')
  const [mode, setMode] = useState<PromptMode>(DEFAULT_MODE)
  const [model, setModel] = useState<GenerationModel>(DEFAULT_MODEL)
  const [variants, setVariants] = useState<Variant[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [status, setStatus] = useState<GenerateStatus | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const nextId = useRef(1)
  const controller = useRef<AbortController | null>(null)

  const busy = status !== null
  const tooShort = description.trim().length < DESCRIPTION_LIMITS.min

  useEffect(() => saveDraft(description), [description])

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [busy])

  useEffect(() => () => controller.current?.abort(), [])

  const patchVariant = (id: number, patch: Partial<Variant>) =>
    setVariants((all) => all.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)))

  async function handleGenerate() {
    if (tooShort || busy) return
    setFormError(null)
    setElapsed(0)
    controller.current = new AbortController()
    const request: GenerateRequest = { description: description.trim(), mode, model, ...(business ? { business } : {}) }
    const started = Date.now()
    let response: GenerateResponse | null = null
    let error: string | null = null
    try {
      response = await generateSiteFromDescription(request, { onStatus: setStatus, signal: controller.current.signal })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus(null)
        return
      }
      error = err instanceof GenerateError ? err.message : 'Не удалось связаться с функцией. Попробуйте ещё раз'
    }
    setStatus(null)

    const id = nextId.current++
    setVariants((all) => [
      ...all,
      { id, request, response, error, summary: response ? 'loading' : 'unavailable', waitedMs: Date.now() - started },
    ])
    setActiveId(id)
    if (response) patchVariant(id, { summary: await fetchSummary(response.runId, mode, response.markdown) })
  }

  function handleRemove(id: number) {
    setVariants((all) => {
      const index = all.findIndex((variant) => variant.id === id)
      const rest = all.filter((variant) => variant.id !== id)
      setActiveId((current) => (current === id ? (rest[Math.min(index, rest.length - 1)]?.id ?? null) : current))
      return rest
    })
  }

  function handleClear() {
    if (variants.length && !window.confirm('Удалить все варианты?')) return
    setVariants([])
    setActiveId(null)
  }

  const active = variants.find((variant) => variant.id === activeId) ?? null

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Песочница</h1>
            <p className="text-sm text-zinc-500">Генерация без создания сайта: сравнивайте варианты, модели и режимы</p>
          </div>
          <button onClick={onBack} className={ghostButton}>← К моим сайтам</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white dark:bg-zinc-900 rounded-lg p-5 border border-zinc-200 dark:border-zinc-800">
          <label htmlFor="playground-description" className="block text-sm font-medium mb-2">Описание бизнеса</label>
          <textarea
            id="playground-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_LIMITS.max}
            rows={5}
            disabled={busy}
            placeholder="Вставьте описание — оно сохраняется в браузере между перезагрузками"
            className={`${field} mb-4 disabled:opacity-60`}
          />
          <div className="grid gap-3 sm:grid-cols-3 mb-4 text-sm">
            <label className="block">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-400">Модель</span>
              <select value={model} onChange={(e) => setModel(e.target.value as GenerationModel)} disabled={busy} className={field}>
                {GENERATION_MODELS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-400">Режим</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as PromptMode)} disabled={busy} className={field}>
                <option value="json">JSON по схеме (json)</option>
                <option value="markdown">Разметка напрямую (markdown)</option>
              </select>
            </label>
            <label className="block">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-400">Ниша (необязательно)</span>
              <select value={business} onChange={(e) => setBusiness(e.target.value as BusinessName | '')} disabled={busy} className={field}>
                <option value="">Не выбрана</option>
                {BUSINESS_NAMES.map((name) => <option key={name} value={name}>{capitalize(BUSINESSES[name])}</option>)}
              </select>
            </label>
          </div>

          {status && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3" role="status" aria-live="polite">
              {STATUS_TEXT[status]}… {elapsed > 0 && <span className="tabular-nums">{elapsed} с</span>}
            </p>
          )}
          {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">{formError}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGenerate}
              disabled={busy || tooShort}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Генерируем…' : 'Сгенерировать'}
            </button>
            {busy && <button onClick={() => controller.current?.abort()} className={ghostButton}>Остановить</button>}
            <button onClick={handleClear} disabled={!variants.length || busy} className={`${ghostButton} sm:ml-auto`}>Очистить все</button>
          </div>
        </section>

        {variants.length > 0 && (
          <section>
            <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Варианты">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  role="tab"
                  aria-selected={variant.id === activeId}
                  onClick={() => setActiveId(variant.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    variant.id === activeId
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Вариант {variant.id}
                  <span className="ml-2 text-xs text-zinc-500">{variant.request.model.replace('GigaChat-', '')} · {variant.request.mode}</span>
                </button>
              ))}
            </div>
            {active && (
              <VariantView
                key={active.id}
                variant={active}
                onRemove={() => handleRemove(active.id)}
                createSite={createSite}
                onSiteCreated={onSiteCreated}
              />
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function VariantView({
  variant,
  onRemove,
  createSite,
  onSiteCreated,
}: {
  variant: Variant
  onRemove: () => void
  createSite: PlaygroundPageProps['createSite']
  onSiteCreated: (site: Site) => void
}) {
  const { response, error, request } = variant
  const markdown = response?.markdown ?? null
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const card = useMemo(() => (markdown ? parseCardMarkdown(markdown) : null), [markdown])
  const resolved = useMemo(() => (card?.data ? resolveTheme(card.data) : null), [card])

  async function handleCopy() {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCreateError('Не удалось скопировать — выделите разметку вручную')
    }
  }

  async function handleCreate() {
    if (!markdown || creating) return
    setCreating(true)
    setCreateError(null)
    const { data, error: saveError } = await createSite(siteName(markdown), markdown)
    setCreating(false)
    if (saveError || !data) {
      setCreateError('Сайт не сохранился. Проверьте интернет и попробуйте ещё раз')
      return
    }
    onSiteCreated(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleCopy} disabled={!markdown} className={ghostButton}>{copied ? 'Скопировано' : 'Копировать разметку'}</button>
        <button onClick={handleCreate} disabled={!markdown || creating} className={ghostButton}>
          {creating ? 'Создаём…' : 'Создать сайт из этого варианта'}
        </button>
        <button onClick={onRemove} className={`${ghostButton} sm:ml-auto`}>Удалить вариант</button>
      </div>
      {createError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{createError}</p>}

      <SummaryCard variant={variant} />

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {response && !markdown && (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {response.message ?? 'Документа нет'} (исход: {response.outcome})
        </p>
      )}
      {response?.message && markdown && <p className="text-sm text-amber-700 dark:text-amber-400" role="status">{response.message}</p>}

      {markdown && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium mb-2">Итоговая разметка</h3>
            <textarea
              readOnly
              value={markdown}
              aria-label={`Разметка варианта ${variant.id} (${request.model}, ${request.mode})`}
              className="w-full h-[640px] px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Превью</h3>
            <div className="h-[640px] rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
              {card?.data && resolved ? (
                <PreviewPane data={card.data} resolved={resolved} onImageUpload={() => {}} />
              ) : (
                <p className="p-4 text-sm text-red-600 dark:text-red-400">В разметке остались ошибки, превью не построено: {card?.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ variant }: { variant: Variant }) {
  const { request, response, summary, waitedMs } = variant
  const rows: [string, string][] = [
    ['Модель', request.model],
    ['Режим', request.mode],
    ['Ниша', request.business ? BUSINESSES[request.business] : 'не выбрана'],
    ['Исход', response?.outcome ?? 'нет ответа'],
    ['Попыток', response ? String(response.attempts) : '—'],
    ['Ждали', `${(waitedMs / 1000).toFixed(1)} с`],
  ]
  if (typeof summary === 'object') {
    rows.push(['prompt_version', summary.promptVersion], ['pipeline_version', summary.pipelineVersion])
    if (summary.responseModel) rows.push(['Ответила модель', summary.responseModel])
    if (summary.tokens.in !== null || summary.tokens.out !== null) {
      rows.push(['Токены (вход / выход)', `${summary.tokens.in ?? '—'} / ${summary.tokens.out ?? '—'}`])
    }
    rows.push(['Ошибок / предупреждений', `${summary.errors} / ${summary.warnings}`])
  }
  if (response) rows.push(['run_id', response.runId])

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 text-sm">
      <h3 className="font-medium mb-3">Сводка</h3>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([name, value]) => (
          <div key={name} className="flex gap-2">
            <dt className="text-zinc-500 shrink-0">{name}:</dt>
            <dd className="font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>

      {response && (
        <div className="mt-4">
          <h4 className="font-medium mb-1">Что сделала обработка</h4>
          {summary === 'loading' && <p className="text-zinc-500">Читаем журнал запуска…</p>}
          {summary === 'unavailable' && <p className="text-zinc-500">Журнал запуска недоступен (запись не нашлась в generation_logs).</p>}
          {typeof summary === 'object' && (
            <>
              {summary.fixedCodes.length === 0 ? (
                <p className="text-zinc-500">Автоисправлений нет (fixed_codes пуст).</p>
              ) : (
                <ul className="list-disc pl-5 space-y-0.5">
                  {summary.fixedCodes.map((fixed) => (
                    <li key={fixed.code}>
                      <code>{fixed.code}</code>{fixed.count > 1 ? ` ×${fixed.count}` : ''} — {fixed.label}
                    </li>
                  ))}
                </ul>
              )}
              {summary.removedLines.length > 0 && (
                <div className="mt-2">
                  <p className="text-zinc-500">Строки ответа модели, которых нет в итоге (убраны или изменены):</p>
                  <pre className="mt-1 p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-xs overflow-auto whitespace-pre-wrap">{summary.removedLines.join('\n')}</pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
