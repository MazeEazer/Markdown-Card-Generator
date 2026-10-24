import { useState } from 'react'
import { TEMPLATES, type SiteTemplate } from '../../data/templates'
import { looksLikeDescription } from '../../lib/looksLikeDescription'

interface TemplateFormProps {
  onCreate: (name: string, templateId: SiteTemplate['id']) => Promise<void>
  /** В поле названия вписали описание бизнеса — перейти в генерацию с этим текстом */
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
        <div id="site-name-hint" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-wash px-3 py-2 text-sm" role="status">
          <span className="text-ink-muted">Похоже на описание — создать сайт с ИИ?</span>
          <button type="button" onClick={() => onUseAi(name.trim())} className="font-medium underline underline-offset-4">
            Создать с ИИ
          </button>
        </div>
      )}

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

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={creating || !name.trim()} className="ui-btn-primary">
          {creating ? 'Создаём…' : 'Создать'}
        </button>
        <button type="button" onClick={onCancel} className="ui-btn-secondary">Отмена</button>
      </div>
    </form>
  )
}
