import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MODEL, DESCRIPTION_LIMITS, GENERATION_MODELS, type GenerationModel } from '../dsl/generate'
import type { PromptMode } from '../dsl/prompt'
import { BUSINESS_NAMES, BUSINESSES, type BusinessName } from '../dsl/schema/frontmatter'
import type { Site } from '../hooks/useSites'
import { type GenerateResponse, type GenerateStatus, GenerateError } from '../lib/generateQueue'
import { generateSiteFromDescription } from '../lib/generateSite'
import { parseCardMarkdown } from '../lib/parser'

interface GenerateSiteDialogProps {
  createSite: (name: string, markdown: string) => Promise<{ data: Site | null; error: unknown }>
  onCreated: (site: Site) => void
  onClose: () => void
}

const PLACEHOLDER =
  'Например: Барбершоп «Борода» в Самаре, ул. Ленина, 10. Мужская стрижка — 1500 ₽, борода — 800 ₽. ' +
  'Работаем каждый день с 10 до 20. Звоните +7 999 123-45-67 или пишите в Telegram @barber_ivan.'

const STATUS_TEXT: Record<GenerateStatus, string> = {
  generating: 'Нейросеть составляет сайт и проверяет его. Обычно это 10–60 секунд',
  queued: 'Нейросеть занята другим запросом — вы в очереди, повторим автоматически',
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Название сайта в списке — из шапки готового документа. */
function siteName(markdown: string): string {
  return parseCardMarkdown(markdown).data?.name?.trim() || 'Новый сайт'
}

/** Форма «Создать сайт по описанию»: описание → generate-site → новый сайт открывается в редакторе. */
export function GenerateSiteDialog({ createSite, onCreated, onClose }: GenerateSiteDialogProps) {
  const [description, setDescription] = useState('')
  const [business, setBusiness] = useState<BusinessName | undefined>()
  const [mode, setMode] = useState<PromptMode>('markdown')
  const [model, setModel] = useState<GenerationModel>(DEFAULT_MODEL)
  const [status, setStatus] = useState<GenerateStatus | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Сайт создан, но есть что сказать (ответ обрезан, остались ошибки) — показываем перед переходом
  const [notice, setNotice] = useState<{ site: Site; message: string } | null>(null)
  const controller = useRef<AbortController | null>(null)

  const busy = status !== null
  const tooShort = description.trim().length < DESCRIPTION_LIMITS.min

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [busy])

  // Ушли со страницы — запрос больше не нужен
  useEffect(() => () => controller.current?.abort(), [])

  async function handleGenerate() {
    if (tooShort || busy) return
    setError(null)
    setElapsed(0)
    controller.current = new AbortController()
    let result: GenerateResponse
    try {
      result = await generateSiteFromDescription(
        { description: description.trim(), business, mode, model },
        { onStatus: setStatus, signal: controller.current.signal },
      )
    } catch (err) {
      setStatus(null)
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof GenerateError ? err.message : 'Не удалось составить сайт. Попробуйте ещё раз')
      return
    }

    if (!result.markdown) {
      setStatus(null)
      setError(result.message ?? 'Не получилось составить сайт по описанию. Попробуйте описать бизнес подробнее')
      return
    }
    const { data, error: saveError } = await createSite(siteName(result.markdown), result.markdown)
    setStatus(null)
    if (saveError || !data) {
      setError('Сайт составлен, но не сохранился. Проверьте интернет и попробуйте ещё раз')
      return
    }
    if (result.message) setNotice({ site: data, message: result.message })
    else onCreated(data)
  }

  function handleCancel() {
    if (busy) controller.current?.abort()
    else onClose()
  }

  if (notice) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold mb-2">Сайт составлен</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-4" role="status">{notice.message}</p>
        <button
          onClick={() => onCreated(notice.site)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Открыть в редакторе
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-lg font-semibold mb-1">Сайт по описанию</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Расскажите своими словами: чем занимаетесь, цены, адрес, часы работы и как с вами связаться.
        Нейросеть не придумывает то, чего нет в описании, — недостающее редактор подскажет добавить.
      </p>

      <label htmlFor="generate-description" className="block text-sm font-medium mb-2">Описание</label>
      <textarea
        id="generate-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={PLACEHOLDER}
        maxLength={DESCRIPTION_LIMITS.max}
        rows={5}
        disabled={busy}
        autoFocus
        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mb-4 disabled:opacity-60"
      />

      <p className="text-sm font-medium mb-2">Вид бизнеса</p>
      <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="Вид бизнеса">
        {[undefined, ...BUSINESS_NAMES].map((name) => (
          <button
            key={name ?? 'any'}
            type="button"
            role="radio"
            aria-checked={business === name}
            disabled={busy}
            onClick={() => setBusiness(name)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              business === name
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {name ? capitalize(BUSINESSES[name]) : 'Не важно'}
          </button>
        ))}
      </div>

      <details className="mb-4 text-sm">
        <summary className="cursor-pointer text-zinc-500 select-none">Настройки для эксперимента</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block mb-1 text-zinc-600 dark:text-zinc-400">Режим</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PromptMode)}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <option value="markdown">Разметка напрямую (markdown)</option>
              <option value="json">JSON по схеме (json)</option>
            </select>
          </label>
          <label className="block">
            <span className="block mb-1 text-zinc-600 dark:text-zinc-400">Модель</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as GenerationModel)}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              {GENERATION_MODELS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </details>

      {status && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4" role="status" aria-live="polite">
          {STATUS_TEXT[status]}… {elapsed > 0 && <span className="tabular-nums">{elapsed} с</span>}
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={busy || tooShort}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Составляем…' : 'Создать сайт'}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {busy ? 'Остановить' : 'Отмена'}
        </button>
      </div>
    </div>
  )
}
