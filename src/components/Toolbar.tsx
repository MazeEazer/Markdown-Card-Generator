import type { ThemeName } from '../types/card'
import { THEME_LABELS } from '../lib/themeEngine'

interface ToolbarProps {
  themeOverride: ThemeName | 'auto'
  onThemeChange: (theme: ThemeName | 'auto') => void
  onLoadTemplate: () => void
  onExportHtml: () => void
  parseError: string | null
}

export function Toolbar({
  themeOverride,
  onThemeChange,
  onLoadTemplate,
  onExportHtml,
  parseError,
}: ToolbarProps) {
  return (
    <header className="flex flex-col gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">MD Card</span>
          <span className="text-xs text-zinc-400 hidden sm:inline">Markdown → сайт-визитка</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

        </div>
      </div>

      {parseError && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          {parseError}
        </div>
      )}
    </header>
  )
}
