import { useState } from 'react'
import { templateMarkdown, type SiteTemplate } from '../data/templates'
import { useSites, type Site } from '../hooks/useSites'
import { useAuth } from '../contexts/AuthContext'
import { takeStartIntent } from '../lib/startIntent'
import { GenerateSiteDialog } from './GenerateSiteDialog'
import { AppHeader } from './home/AppHeader'
import { CreateButtons } from './home/CreateButtons'
import { Hero } from './home/Hero'
import { TemplateForm } from './home/TemplateForm'

interface SitesListProps {
  onEditSite: (site: Site) => void
  onSignOut: () => void
  /** Есть — в шапке появляется пункт «Песочница» (только в dev или для VITE_PLAYGROUND_USER_IDS) */
  onOpenPlayground?: () => void
}

/** Открытая форма создания: генерация с ИИ (с текстом, если пришли из формы шаблона) или шаблон. */
type Panel = { kind: 'ai'; description?: string } | { kind: 'template' } | null

export function SitesList({ onEditSite, onSignOut, onOpenPlayground }: SitesListProps) {
  const { sites, loading, createSite, deleteSite } = useSites()
  const { profile } = useAuth()
  // Кнопку первого экрана нажали до входа — сразу открываем выбранную форму
  const [panel, setPanel] = useState<Panel>(() => {
    const intent = takeStartIntent()
    return intent ? { kind: intent } : null
  })

  async function handleCreateFromTemplate(name: string, templateId: SiteTemplate['id']) {
    // Название сайта в БД = то, что ввёл пользователь; оно же подставляется в шаблон как name
    const { data, error } = await createSite(name, templateMarkdown(templateId, name))
    if (!error && data) onEditSite(data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот сайт? Это действие нельзя отменить.')) return
    const { error } = await deleteSite(id)
    if (error) alert('Ошибка при удалении: ' + error.message)
  }

  const openAi = () => setPanel({ kind: 'ai' })
  const openTemplate = () => setPanel({ kind: 'template' })
  const showHero = sites.length === 0 && !panel

  return (
    <div className="ui-page">
      <AppHeader>
        {profile?.email && <span className="hidden truncate text-sm text-ink-muted sm:inline">{profile.email}</span>}
        {onOpenPlayground && (
          <button onClick={onOpenPlayground} className="ui-btn-secondary px-3 py-1.5">Песочница</button>
        )}
        <button onClick={onSignOut} className="ui-btn-secondary px-3 py-1.5">Выйти</button>
      </AppHeader>

      {loading ? (
        <p className="py-24 text-center text-ink-muted">Загрузка…</p>
      ) : showHero ? (
        <Hero onAi={openAi} onTemplate={openTemplate} />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Мои сайты</h1>
          <p className="mt-2 text-ink-muted">Создайте новый сайт или откройте готовый, чтобы поправить.</p>

          <div className="mt-8">
            {panel?.kind === 'ai' ? (
              <GenerateSiteDialog
                initialDescription={panel.description}
                createSite={(name, markdown) => createSite(name, markdown)}
                onCreated={onEditSite}
                onClose={() => setPanel(null)}
              />
            ) : panel?.kind === 'template' ? (
              <TemplateForm
                onCreate={handleCreateFromTemplate}
                onUseAi={(description) => setPanel({ kind: 'ai', description })}
                onCancel={() => setPanel(null)}
              />
            ) : (
              <CreateButtons onAi={openAi} onTemplate={openTemplate} layout="row" />
            )}
          </div>

          {sites.length > 0 && (
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <li key={site.id} className="ui-panel flex flex-col p-5 transition-colors hover:border-line-strong">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{site.name}</h2>
                      <p className="mt-1 font-geist-mono text-xs text-ink-muted">
                        {new Date(site.updated_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="rounded-md p-1 text-ink-muted transition-colors hover:text-red-600"
                      title="Удалить"
                      aria-label={`Удалить сайт «${site.name}»`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                  <button onClick={() => onEditSite(site)} className="ui-btn-primary mt-auto w-full">Открыть</button>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  )
}
