import type { ThemeName } from '../types/card'
import { THEME_LABELS } from '../lib/themeEngine'

interface ToolbarProps {
  themeOverride: ThemeName | 'auto'
  onThemeChange: (theme: ThemeName | 'auto') => void
  onLoadTemplate: () => void
  onExportHtml: () => void
  parseError: string | null
  onSignOut: () => void
  userEmail: string | null
  onBackToList: () => void
  saving: boolean
  /** Есть несохранённые изменения */
  dirty: boolean
  /** Можно ли сохранять прямо сейчас */
  canSave: boolean
  onSave: () => void
  saveError: string | null
  siteName?: string
}

export function Toolbar({
  themeOverride,
  onThemeChange,
  onLoadTemplate,
  onExportHtml,
  parseError,
  onSignOut,
  userEmail,
  onBackToList,
  saving,
  dirty,
  canSave,
  onSave,
  saveError,
  siteName,
}: ToolbarProps) {
  return (
    <header className="flex flex-col gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Мои сайты"
          >
            ← Назад
          </button>
          {siteName && (
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {siteName}
            </span>
          )}
          {saving ? (
            <span className="text-xs text-zinc-500 animate-pulse">Сохранение...</span>
          ) : dirty ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">● не сохранено</span>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">сохранено</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            title="Сохранить (Ctrl/Cmd + S)"
            className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {userEmail && (
            <span className="text-xs text-zinc-500 hidden sm:inline">{userEmail}</span>
          )}
          <select
            value={themeOverride}
            onChange={(e) => onThemeChange(e.target.value as ThemeName | 'auto')}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          >
            <option value="auto">Тема: авто</option>
            {(Object.entries(THEME_LABELS) as [ThemeName, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onLoadTemplate}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Загрузить пример
          </button>
          <button
            type="button"
            onClick={onExportHtml}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Экспорт HTML
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
      {parseError && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          {parseError}
        </div>
      )}
      {saveError && (
        <div className="text-xs px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          {saveError}
        </div>
      )}
    </header>
  )
}