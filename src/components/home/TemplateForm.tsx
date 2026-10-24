import { useState } from 'react'
import { TEMPLATES, type SiteTemplate } from '../../data/templates'
import { looksLikeDescription } from '../../lib/looksLikeDescription'

interface TemplateFormProps {
  onCreate: (name: string, templateId: SiteTemplate['id']) => Promise<void>
  /** Перейти в генерацию: текст из поля названия становится описанием (пусто — диалог пустой) */
  onUseAi: (description: string) => void
  onCancel: () => void
}

/** «Из готового шаблона»: название сайта и шаблон по нише. */
export function TemplateForm({ onCreate, onUseAi, onCancel }: TemplateFormProps) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState<SiteTemplate['id']>('barbershop')
  const [creating, setCreating] = useState(false)
  const description = looksLikeDescription(name)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      await onCreate(name.trim(), templateId)
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={submit} className="ui-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Сайт из шаблона</h2>
      <p className="mt-1 text-sm text-ink-muted">Выберите шаблон и впишите своё: цены, часы, контакты.</p>

      <p className="mt-5 mb-1.5 text-sm font-medium">Шаблон</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Шаблон сайта">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={templateId === template.id}
            onClick={() => setTemplateId(template.id)}
            className="ui-choice"
          >
            <span className="block font-medium">{template.label}</span>
            <span className="block text-xs text-ink-muted">{template.description}</span>
          </button>
        ))}
      </div>

      <label htmlFor="site-name" className="mt-5 mb-1.5 block text-sm font-medium">Название сайта</label>
      <input
        id="site-name"
        type="text"
        placeholder="Например: Барбершоп «Борода»"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="ui-field"
        autoFocus
        aria-describedby={description ? 'site-name-hint' : undefined}
      />
      {description && (
        <p id="site-name-hint" className="mt-2 text-sm text-ink-muted" role="status">
          Похоже на описание — создать с ИИ?
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={creating || !name.trim()} className="ui-btn-primary">
          {creating ? 'Создаём…' : 'Создать'}
        </button>
        <AiSwitchButton highlighted={description} onClick={() => onUseAi(name.trim())} />
        <button type="button" onClick={onCancel} className="ui-btn-secondary">Отмена</button>
      </div>
    </form>
  )
}

/**
 * «✦ Создать с ИИ» рядом с «Создать» — видна всегда. Если в названии похоже на описание, кнопка выделяется
 * (рамка цвета текста и обводка), а подсказка над ней объясняет почему; второй кнопки не появляется.
 */
export function AiSwitchButton({ highlighted, onClick }: { highlighted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-highlighted={highlighted || undefined}
      aria-describedby={highlighted ? 'site-name-hint' : undefined}
      className={`ui-btn-secondary ${highlighted ? 'border-ink outline-2 outline-offset-2 outline-ink' : ''}`}
    >
      ✦ Создать с ИИ
      <span className="rounded-full border border-line-strong px-1.5 py-0.5 font-geist-mono text-[10px] font-medium leading-none">ИИ</span>
    </button>
  )
}
