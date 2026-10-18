import { useState } from 'react'
import type { Diagnostic, Severity } from '../dsl/types'
import { countBySeverity, problemRows, problemsSummary } from '../editor/problems'

interface ProblemsPanelProps {
  text: string
  diagnostics: Diagnostic[]
  /** Перевести курсор редактора к проблеме */
  onJump: (diagnostic: Diagnostic) => void
  onFix: (diagnostic: Diagnostic) => void
}

const ICON: Record<Severity, { mark: string; color: string; label: string }> = {
  error: { mark: '●', color: 'text-red-400', label: 'Ошибка' },
  warning: { mark: '▲', color: 'text-amber-400', label: 'Предупреждение' },
  info: { mark: 'i', color: 'text-sky-400', label: 'Подсказка' },
}

/** На телефоне список по умолчанию свёрнут — иначе он съедает половину редактора. */
const openByDefault = () => window.matchMedia('(min-width: 768px)').matches

/** Панель «Проблемы» под редактором: счётчик всегда виден, список раскрывается по клику. */
export function ProblemsPanel({ text, diagnostics, onJump, onFix }: ProblemsPanelProps) {
  const [open, setOpen] = useState(openByDefault)
  const counts = countBySeverity(diagnostics)
  const summaryColor = counts.error > 0 ? 'text-red-400' : counts.warning > 0 ? 'text-amber-400' : 'text-zinc-400'
  const rows = problemRows(text, diagnostics)

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={rows.length === 0}
        aria-expanded={open && rows.length > 0}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left hover:bg-zinc-900 disabled:hover:bg-transparent disabled:cursor-default"
      >
        <span className="font-medium text-zinc-300">Проблемы</span>
        <span className={`${summaryColor} min-w-0 truncate`}>{problemsSummary(diagnostics)}</span>
        {rows.length > 0 && (
          <span className="ml-auto shrink-0 whitespace-nowrap text-zinc-500">{open ? 'Свернуть ▾' : 'Показать ▴'}</span>
        )}
      </button>

      {open && rows.length > 0 && (
        <ul className="max-h-36 md:max-h-48 overflow-y-auto border-t border-zinc-900 pb-1">
          {rows.map(({ diagnostic, line }, index) => {
            const icon = ICON[diagnostic.severity]
            return (
              <li key={`${diagnostic.code}-${diagnostic.from}-${index}`} className="flex items-start gap-2 px-4 hover:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => onJump(diagnostic)}
                  title="Перейти к месту в тексте"
                  className="flex-1 min-w-0 flex items-start gap-2 py-1.5 text-left"
                >
                  <span className={`${icon.color} w-3 shrink-0 text-center text-xs leading-5`} aria-label={icon.label}>
                    {icon.mark}
                  </span>
                  <span className="text-zinc-300 leading-5">{diagnostic.message}</span>
                  <span className="ml-auto shrink-0 pl-2 text-xs leading-5 text-zinc-500 font-mono">стр. {line}</span>
                </button>
                {diagnostic.fix && (
                  <button
                    type="button"
                    onClick={() => onFix(diagnostic)}
                    title={diagnostic.fix.label}
                    className="shrink-0 my-1 px-2 py-0.5 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Исправить
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
