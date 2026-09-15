import { useCallback, useEffect, useMemo, useState } from 'react'
import { saveAs } from 'file-saver'
import { defaultTemplate } from './data/defaultTemplate'
import { exportHtml } from './lib/exportHtml'
import { parseCardMarkdown, FALLBACK_CARD } from './lib/parser'
import { resolveTheme } from './lib/themeEngine'
import type { CardData, ThemeName } from './types/card'
import { EditorPane } from './components/EditorPane'
import { PreviewPane } from './components/PreviewPane'
import { Toolbar } from './components/Toolbar'
import { SitesList } from './components/SitesList'
import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { useSites, type Site } from './hooks/useSites'

type MobileTab = 'editor' | 'preview'
type View = 'list' | 'editor'

function getInitialCard(): CardData {
  const result = parseCardMarkdown(defaultTemplate)
  return result.data ?? FALLBACK_CARD
}

export default function App() {
  // === АВТОРИЗАЦИЯ И БАЗА ДАННЫХ ===
  const { user, loading: authLoading, signOut } = useAuth()
  const { currentSiteId, setCurrentSiteId, saveSite } = useSites()

  // === СОСТОЯНИЕ ИНТЕРФЕЙСА ===
  const [view, setView] = useState<View>('list')
  const [currentSite, setCurrentSite] = useState<Site | null>(null)
  const [markdown, setMarkdown] = useState(defaultTemplate)
  const [themeOverride, setThemeOverride] = useState<ThemeName | 'auto'>('auto')
  const [lastValidCard, setLastValidCard] = useState<CardData>(getInitialCard)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(defaultTemplate)
  const [saveError, setSaveError] = useState<string | null>(null)

  // === ПАРСИНГ И ТЕМА ===
  const parsed = useMemo(() => parseCardMarkdown(markdown), [markdown])

  const displayCard = useMemo(() => {
    if (parsed.data) return parsed.data
    return lastValidCard ?? FALLBACK_CARD
  }, [parsed.data, lastValidCard])

  useEffect(() => {
    if (parsed.data) {
      setLastValidCard(parsed.data)
      setParseError(null)
    } else if (parsed.error) {
      setParseError(parsed.error)
    }
  }, [parsed])

  const resolved = useMemo(
    () => resolveTheme(displayCard, themeOverride === 'auto' ? undefined : themeOverride),
    [displayCard, themeOverride],
  )

  // === СОХРАНЕНИЕ ПО КНОПКЕ ===
  // Название сайта НЕ перезаписывается — сохраняется только markdown
  const dirty = markdown !== lastSaved
  const canSave = Boolean(currentSiteId) && dirty && !saving

  const handleSave = useCallback(async () => {
    if (!currentSiteId || saving || markdown === lastSaved) return

    setSaving(true)
    setSaveError(null)

    const { error } = await saveSite(currentSiteId, markdown)

    setSaving(false)
    if (error) {
      console.error('❌ Ошибка сохранения:', error)
      setSaveError(`Не удалось сохранить: ${error.message ?? 'неизвестная ошибка'}`)
    } else {
      console.log('✅ Сохранено:', currentSite?.name)
      setLastSaved(markdown)
    }
  }, [currentSite, currentSiteId, lastSaved, markdown, saveSite, saving])

  // Ctrl/Cmd + S — сохранить
  useEffect(() => {
    if (view !== 'editor') return

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, handleSave])

  // Предупреждаем браузер, если есть несохранённые изменения
  useEffect(() => {
    if (view !== 'editor' || !dirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [view, dirty])

  // === ОБРАБОТЧИКИ ===
  const handleExportHtml = useCallback(() => {
    if (!parsed.data) return
    const { html, filename } = exportHtml(parsed.data, resolved)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    saveAs(blob, filename)
  }, [parsed.data, resolved])

  const handleImageUpload = useCallback((dataUrl: string) => {
    setMarkdown(prev => {
      if (/^avatar:\s*.+$/m.test(prev)) {
        return prev.replace(/^avatar:\s*.+$/m, `avatar: ${dataUrl}`)
      }
      if (/^location:\s*.+$/m.test(prev)) {
        return prev.replace(/^location:\s*.+$/m, match => `${match}\navatar: ${dataUrl}`)
      }
      return prev + `\navatar: ${dataUrl}\n`
    })
  }, [])

  const handleEditSite = useCallback((site: Site) => {
    setCurrentSiteId(site.id) // ВАЖНО: сообщаем хуку ID текущего сайта
    setCurrentSite(site)
    setMarkdown(site.markdown)
    setLastSaved(site.markdown)
    setSaveError(null)
    setView('editor')
  }, [setCurrentSiteId])

  const handleLoadTemplate = useCallback(() => {
    if (dirty && !window.confirm('Загрузить пример? Несохранённые изменения будут потеряны.')) return
    setMarkdown(defaultTemplate)
  }, [dirty])

  const handleBackToList = useCallback(() => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return

    setView('list')
    setCurrentSite(null)
    setCurrentSiteId(null)
    setMarkdown(defaultTemplate)
    setLastSaved(defaultTemplate)
    setSaveError(null)
  }, [dirty, setCurrentSiteId])

  const handleSignOut = useCallback(async () => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return
    await signOut()
  }, [dirty, signOut])

  // === РЕНДЕР: ЗАГРУЗКА ===
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-zinc-500">Загрузка...</div>
      </div>
    )
  }

  // === РЕНДЕР: АВТОРИЗАЦИЯ ===
  if (!user) {
    return <AuthPage />
  }

  // === РЕНДЕР: СПИСОК САЙТОВ ===
  if (view === 'list') {
    return <SitesList onEditSite={handleEditSite} onSignOut={signOut} />
  }

  // === РЕНДЕР: РЕДАКТОР ===
  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Toolbar
        themeOverride={themeOverride}
        onThemeChange={setThemeOverride}
        onLoadTemplate={handleLoadTemplate}
        onExportHtml={handleExportHtml}
        parseError={parseError}
        onSignOut={handleSignOut}
        userEmail={user.email ?? null}
        onBackToList={handleBackToList}
        saving={saving}
        dirty={dirty}
        canSave={canSave}
        saveError={saveError}
        onSave={handleSave}
        siteName={currentSite?.name} // Название сайта из БД, а не из Markdown
      />
      <div className="md:hidden flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        {(['editor', 'preview'] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mobileTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-zinc-500'
            }`}
          >
            {tab === 'editor' ? 'Редактор' : 'Превью'}
          </button>
        ))}
      </div>
      <div className="flex-1 grid md:grid-cols-2 min-h-0 overflow-hidden">
        <div className={`h-full min-h-0 ${mobileTab === 'editor' ? 'block' : 'hidden'} md:block`}>
          <EditorPane value={markdown} onChange={setMarkdown} />
        </div>
        <div className={`h-full min-h-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 ${mobileTab === 'preview' ? 'block' : 'hidden'} md:block`}>
          <PreviewPane
            data={displayCard}
            resolved={resolved}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>
    </div>
  )
}