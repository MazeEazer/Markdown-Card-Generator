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

  // === МГНОВЕННОЕ АВТОСОХРАНЕНИЕ (300мс) ===
  // Название сайта НЕ перезаписывается — сохраняется только markdown
  useEffect(() => {
    if (!currentSiteId || !currentSite) return

    const timer = setTimeout(async () => {
      setSaving(true)
      const { error } = await saveSite(currentSiteId, markdown)
      if (error) {
        console.error('❌ Ошибка сохранения:', error)
      } else {
        console.log('✅ Сохранено:', currentSite.name)
      }
      setSaving(false)
    }, 300) // 300мс — ощущается как мгновенное сохранение

    return () => clearTimeout(timer)
  }, [markdown, currentSiteId, currentSite, saveSite])

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
    setView('editor')
  }, [setCurrentSiteId])

  const handleBackToList = useCallback(() => {
    setView('list')
    setCurrentSite(null)
    setCurrentSiteId(null)
    setMarkdown(defaultTemplate)
  }, [setCurrentSiteId])

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
        onLoadTemplate={() => setMarkdown(defaultTemplate)}
        onExportHtml={handleExportHtml}
        parseError={parseError}
        onSignOut={signOut}
        userEmail={user.email}
        onBackToList={handleBackToList}
        saving={saving}
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