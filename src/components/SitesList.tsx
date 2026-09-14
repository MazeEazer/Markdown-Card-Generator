import { useState } from 'react'
import { useSites, type Site } from '../hooks/useSites'
import { useAuth } from '../contexts/AuthContext'

interface SitesListProps {
  onEditSite: (site: Site) => void
  onSignOut: () => void
}

export function SitesList({ onEditSite, onSignOut }: SitesListProps) {
  const { sites, loading, createSite, deleteSite } = useSites()
  const { profile } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [creating, setCreating] = useState(false)

 async function handleCreate() {
  if (!newSiteName.trim()) return
  
  setCreating(true)
  
  // Название сайта в БД = то, что ввёл пользователь
  // Но в Markdown оставляем шаблон "Ваше имя", чтобы пользователь сам заполнил
  const defaultMarkdown = `---
name: Ваше имя
title: Ваша должность
theme: auto
accent: auto
avatar: https://api.dicebear.com/7.x/avataaars/svg?seed=NewUser
location: Город
links:
  - label: GitHub
    url: https://github.com
    icon: github
  - label: Email
    url: mailto:email@example.com
    icon: mail
---

## О себе
Расскажите о себе...

## Навыки
Навык 1, Навык 2, Навык 3
`
  
  const { data, error } = await createSite(newSiteName.trim(), defaultMarkdown)
  
  if (!error && data) {
    onEditSite(data)
    setShowCreate(false)
    setNewSiteName('')
  }
  setCreating(false)
}

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот сайт? Это действие нельзя отменить.')) return
    
    const { error } = await deleteSite(id)
    if (error) {
      alert('Ошибка при удалении: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MD Card</h1>
            <p className="text-sm text-zinc-500">Мои сайты</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.email && (
              <span className="text-sm text-zinc-500">{profile.email}</span>
            )}
            <button
              onClick={onSignOut}
              className="text-sm px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Загрузка...</div>
        ) : (
          <>
            {/* Create button */}
            <div className="mb-8">
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  + Создать новый сайт
                </button>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold mb-4">Новый сайт</h3>
                  <input
                    type="text"
                    placeholder="Название сайта"
                    value={newSiteName}
                    onChange={e => setNewSiteName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mb-4"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newSiteName.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {creating ? 'Создание...' : 'Создать'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false)
                        setNewSiteName('')
                      }}
                      className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sites grid */}
            {sites.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-4">У вас ещё нет сайтов</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-indigo-600 hover:underline"
                >
                  Создать первый сайт
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(site => (
                  <div
                    key={site.id}
                    className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{site.name}</h3>
                        <p className="text-xs text-zinc-500">
                          Обновлено: {new Date(site.updated_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => onEditSite(site)}
                      className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Редактировать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}