import { useEffect, useRef, useState } from 'react'
import { DESCRIPTION_LIMITS } from '../dsl/generate'
import { BUSINESS_NAMES, BUSINESSES, type BusinessName } from '../dsl/schema/frontmatter'
import type { Site } from '../hooks/useSites'
import { defaultGenerateRequest, type GenerateResponse, type GenerateStatus, GenerateError } from '../lib/generateQueue'
import { generateSiteFromDescription } from '../lib/generateSite'
import { parseCardMarkdown } from '../lib/parser'

interface GenerateSiteDialogProps {
  createSite: (name: string, markdown: string) => Promise<{ data: Site | null; error: unknown }>
  onCreated: (site: Site) => void
  onClose: () => void
  /** Текст, с которого начать (вписали описание в поле названия формы шаблона) */
  initialDescription?: string
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
export function GenerateSiteDialog({ createSite, onCreated, onClose, initialDescription = '' }: GenerateSiteDialogProps) {
  const [description, setDescription] = useState(initialDescription)
  const [business, setBusiness] = useState<BusinessName | undefined>()
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
        defaultGenerateRequest(description, business),
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
      <div className="ui-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-2">Сайт составлен</h2>
        <p className="text-sm text-amber-800 mb-4" role="status">{notice.message}</p>
        <button
          onClick={() => onCreated(notice.site)}
          className="ui-btn-primary"
        >
          Открыть в редакторе
        </button>
      </div>
    )
  }

  return (
    <div className="ui-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight mb-1">Сайт с ИИ</h2>
      <p className="text-sm text-ink-muted mb-5">
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
        className="ui-field mb-4"
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
            className="ui-choice py-1.5 disabled:opacity-60"
          >
            {name ? capitalize(BUSINESSES[name]) : 'Не важно'}
          </button>
        ))}
      </div>


      {status && (
        <p className="text-sm text-ink-muted mb-4" role="status" aria-live="polite">
          {STATUS_TEXT[status]}… {elapsed > 0 && <span className="tabular-nums">{elapsed} с</span>}
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={busy || tooShort}
          className="ui-btn-primary"
        >
          {busy ? 'Составляем…' : 'Создать сайт'}
        </button>
        <button
          onClick={handleCancel}
          className="ui-btn-secondary"
        >
          {busy ? 'Остановить' : 'Отмена'}
        </button>
      </div>
    </div>
  )
}
