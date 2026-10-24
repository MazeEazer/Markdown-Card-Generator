import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import { DEFAULT_TEMPLATE } from './data/templates'
import { exportHtml } from './lib/exportHtml'
import { parseCardMarkdown, previewTargetsFor, FALLBACK_CARD } from './lib/parser'
import { resolveTheme } from './lib/themeEngine'
import { persistTheme, resolveInitialTheme, type ThemePreference } from './lib/themePreference'
import type { CardData } from './types/card'
import { EditorPane, type EditorHandle } from './components/EditorPane'
import { applyTextChange, frontmatterFieldChange } from './dsl/frontmatterEdit'
import { PreviewPane } from './components/PreviewPane'
import { Toolbar } from './components/Toolbar'
import { SitesList } from './components/SitesList'
import { PlaygroundPage } from './components/PlaygroundPage'
import { isPlaygroundPath, PLAYGROUND_PATH, playgroundAllowed } from './lib/playground'
import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { useSites, type Site } from './hooks/useSites'
// Импортируем функцию деплоя (убедись, что файл src/lib/vercelDeploy.ts создан)
import { deployToVercel } from './lib/vercelDeploy'
type MobileTab = 'editor' | 'preview'
type View = 'list' | 'editor'

function getInitialCard(): CardData {
  const result = parseCardMarkdown(DEFAULT_TEMPLATE)
  return result.data ?? FALLBACK_CARD
}

export default function App() {
  // === АВТОРИЗАЦИЯ И БАЗА ДАННЫХ ===
  const { user, loading: authLoading, signOut } = useAuth()
  const { currentSiteId, setCurrentSiteId, saveSite, createSite } = useSites()

  // === ПЕСОЧНИЦА (/playground) ===
  const [onPlaygroundPath, setOnPlaygroundPath] = useState(() => isPlaygroundPath(window.location.pathname))
  useEffect(() => {
    const sync = () => setOnPlaygroundPath(isPlaygroundPath(window.location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const canPlayground = playgroundAllowed(user?.id, {
    dev: import.meta.env.DEV,
    ids: import.meta.env.VITE_PLAYGROUND_USER_IDS,
  })
  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path)
    setOnPlaygroundPath(isPlaygroundPath(path))
  }, [])

  // === СОСТОЯНИЕ ИНТЕРФЕЙСА ===
  const [view, setView] = useState<View>('list')
  const [currentSite, setCurrentSite] = useState<Site | null>(null)
  const [markdown, setMarkdown] = useState(DEFAULT_TEMPLATE)
  const [themeOverride, setThemeOverride] = useState<ThemePreference>('auto')
  const [lastTheme, setLastTheme] = useState<ThemePreference>('auto')
  const [lastValidCard, setLastValidCard] = useState<CardData>(getInitialCard)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor')
  
  // Состояния сохранения
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(DEFAULT_TEMPLATE)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Состояния публикации на Vercel
  const [publishUrl, setPublishUrl] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  // === ПАРСИНГ И ТЕМА ===
  const parsed = useMemo(() => parseCardMarkdown(markdown), [markdown])

  const displayCard = useMemo(() => {
    if (parsed.data) return parsed.data
    return lastValidCard ?? FALLBACK_CARD
  }, [parsed.data, lastValidCard])

  // === СВЯЗЬ ПРЕВЬЮ → РЕДАКТОР ===
  const editorRef = useRef<EditorHandle>(null)
  // Позиции секций нужны, только когда превью показывает текущий текст (а не последний удачный разбор)
  const previewTargets = useMemo(() => (parsed.data ? previewTargetsFor(markdown) : null), [parsed.data, markdown])

  const handleLocate = useCallback(
    (target: { kind: 'header' } | { kind: 'section'; index: number }) => {
      if (!previewTargets) return
      const offset = target.kind === 'header' ? previewTargets.header : previewTargets.sections[target.index]
      if (offset === undefined) return
      // На телефоне редактор на соседней вкладке: сначала показываем его, переходим после отрисовки
      setMobileTab('editor')
      requestAnimationFrame(() => editorRef.current?.jumpTo(offset))
    },
    [previewTargets],
  )

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

  // === СИНХРОНИЗАЦИЯ URL ПУБЛИКАЦИИ ===
  useEffect(() => {
    if (currentSite?.public_url) {
      setPublishUrl(currentSite.public_url)
    } else {
      setPublishUrl(null)
    }
  }, [currentSite])

  // === СОХРАНЕНИЕ ПО КНОПКЕ ===
  const dirty = markdown !== lastSaved || themeOverride !== lastTheme
  const canSave = Boolean(currentSiteId) && dirty && !saving

  const handleSave = useCallback(async () => {
    if (!currentSiteId || saving) return
    if (markdown === lastSaved && themeOverride === lastTheme) return

    setSaving(true)
    setSaveError(null)

    const { error } = await saveSite(currentSiteId, markdown, themeOverride)

    setSaving(false)
    if (error) {
      console.error('❌ Ошибка сохранения:', error)
      setSaveError(`Не удалось сохранить: ${error.message ?? 'неизвестная ошибка'}`)
    } else {
      console.log('✅ Сохранено:', currentSite?.name)
      setLastSaved(markdown)
      setLastTheme(themeOverride)
      persistTheme(currentSiteId, themeOverride)
    }
  }, [currentSite?.name, currentSiteId, lastSaved, lastTheme, markdown, saveSite, saving, themeOverride])

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

  // Фото, перетащенное на превью, — в поле avatar шапки (раньше дописывалось в конец документа — за пределы шапки)
  const handleImageUpload = useCallback((dataUrl: string) => {
    if (editorRef.current?.setFrontmatterField('avatar', dataUrl)) return
    setMarkdown(prev => applyTextChange(prev, frontmatterFieldChange(prev, 'avatar', dataUrl)))
  }, [])

  const handleEditSite = useCallback((site: Site) => {
    setCurrentSiteId(site.id)
    setCurrentSite(site)
    setMarkdown(site.markdown)
    setLastSaved(site.markdown)
    // Восстанавливаем тему сайта: локально сохранённый выбор важнее значения из БД
    const theme = resolveInitialTheme(site.id, site.theme)
    setThemeOverride(theme)
    setLastTheme(theme)
    setSaveError(null)
    setView('editor')
  }, [setCurrentSiteId])

  const handleThemeChange = useCallback((theme: ThemePreference) => {
    setThemeOverride(theme)
    // Сразу запоминаем выбор локально, чтобы он выжил перезагрузку даже без сохранения
    persistTheme(currentSiteId, theme)
  }, [currentSiteId])

  const handleLoadTemplate = useCallback(() => {
    if (dirty && !window.confirm('Загрузить пример? Несохранённые изменения будут потеряны.')) return
    setMarkdown(DEFAULT_TEMPLATE)
  }, [dirty])

  const handleBackToList = useCallback(() => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return

    setView('list')
    setCurrentSite(null)
    setCurrentSiteId(null)
    setMarkdown(DEFAULT_TEMPLATE)
    setLastSaved(DEFAULT_TEMPLATE)
    setThemeOverride('auto')
    setLastTheme('auto')
    setSaveError(null)
  }, [dirty, setCurrentSiteId])

  const handleSignOut = useCallback(async () => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return
    await signOut()
  }, [dirty, signOut])

  // === ПУБЛИКАЦИЯ НА VERCEL ===
// В App.tsx найди handlePublish и измени так:

const handlePublish = useCallback(async () => {
  if (!currentSiteId || !currentSite) { // Убрали проверку !user
    alert('Выберите сайт для публикации')
    return
  }

  if (!parsed.data) {
    alert('Не удалось сгенерировать HTML для публикации.')
    return
  }

  if (!confirm(`Опубликовать сайт "${currentSite.name}"?`)) return

  setPublishing(true)
  try {
    const { html } = exportHtml(parsed.data, resolved)
    
    // Передаём только html, siteId и name
const { url, error } = await deployToVercel(html, currentSiteId)
    if (error) {
      alert(`❌ Ошибка публикации: ${error.message}`)
    } else if (url) {
      setPublishUrl(url)
      
      // Обновляем текущий сайт в состоянии
      setCurrentSite(prev => prev ? { ...prev, public_url: url } : null)
      
      try {
        await navigator.clipboard.writeText(url)
      } catch (err) {
        console.warn('Не удалось скопировать:', err)
      }
      
      alert(`✅ Сайт опубликован!\n\n${url}\n\nСсылка скопирована.`)
    }
  } catch (err: any) {
    alert(`Ошибка: ${err.message || err}`)
  } finally {
    setPublishing(false)
  }
}, [currentSiteId, currentSite, parsed.data, resolved])  // === РЕНДЕР: ЗАГРУЗКА ===
  if (authLoading) {
    return (
      <div className="ui-page flex items-center justify-center">
        <div className="text-ink-muted">Загрузка…</div>
      </div>
    )
  }

  // === РЕНДЕР: АВТОРИЗАЦИЯ ===
  if (!user) {
    return <AuthPage />
  }

  // === РЕНДЕР: ПЕСОЧНИЦА ===
  if (onPlaygroundPath && canPlayground) {
    return (
      <PlaygroundPage
        createSite={(name, md) => createSite(name, md)}
        onSiteCreated={(site) => {
          navigate('/')
          handleEditSite(site)
        }}
        onBack={() => navigate('/')}
      />
    )
  }

  // === РЕНДЕР: СПИСОК САЙТОВ ===
  if (view === 'list') {
    return (
      <SitesList
        onEditSite={handleEditSite}
        onSignOut={signOut}
        onOpenPlayground={canPlayground ? () => navigate(PLAYGROUND_PATH) : undefined}
      />
    )
  }

  // === РЕНДЕР: РЕДАКТОР ===
  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Toolbar
        themeOverride={themeOverride}
        onThemeChange={handleThemeChange}
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
        siteName={currentSite?.name}
        // Новые пропсы для публикации:
        onPublish={handlePublish}
        publishUrl={publishUrl}
        publishing={publishing}
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 overflow-hidden">
        <div className={`h-full min-h-0 ${mobileTab === 'editor' ? 'block' : 'hidden'} md:block`}>
          <EditorPane ref={editorRef} value={markdown} onChange={setMarkdown} siteId={currentSiteId} />
        </div>
        <div className={`h-full min-h-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 ${mobileTab === 'preview' ? 'block' : 'hidden'} md:block`}>
          <PreviewPane
            data={displayCard}
            resolved={resolved}
            onImageUpload={handleImageUpload}
            onLocate={previewTargets ? handleLocate : undefined}
          />
        </div>
      </div>
    </div>
  )
}