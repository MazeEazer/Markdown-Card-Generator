  import type { MouseEvent } from 'react'
  import type { CardData, ResolvedTheme } from '../types/card'
  import { Site } from '../themes/Site'
  import { DropZone } from './DropZone'
  interface PreviewPaneProps {
    data: CardData
    resolved: ResolvedTheme
    onImageUpload: (dataUrl: string) => void
    /** Клик по шапке сайта или по i-й секции — перевести курсор редактора к её строке */
    onLocate?: (target: { kind: 'header' } | { kind: 'section'; index: number }) => void
  }

  /**
   * Что нажато в превью: секция сайта (по порядку тегов <section> — так рендерят все темы, см. themes.test.tsx)
   * или шапка. Ссылки, кнопки и раскрывающиеся вопросы работают как обычно и курсор не двигают.
   */
  function locate(event: MouseEvent<HTMLElement>, root: HTMLElement) {
    const target = event.target as HTMLElement
    if (target.closest('a, button, summary, input, iframe')) return null
    const section = target.closest('section')
    if (section && root.contains(section)) {
      return { kind: 'section' as const, index: [...root.querySelectorAll('section')].indexOf(section) }
    }
    const header = target.closest('header')
    return header && root.contains(header) ? { kind: 'header' as const } : null
  }

  export function PreviewPane({ data, resolved, onImageUpload, onLocate }: PreviewPaneProps) {
    return (
      <div className="h-full overflow-hidden bg-zinc-200 dark:bg-zinc-900">
        <div className="px-4 py-2 border-b border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500 font-mono flex items-center justify-between">
          <span>preview · {resolved.theme}</span>
          <span className="hidden sm:inline" style={{ color: resolved.colors.accent }}>
            {resolved.colors.accent}
          </span>
        </div>
        <div className="h-[calc(100%-33px)] overflow-auto">
                     <DropZone onImage={onImageUpload}>
          <div
            id="card-preview"
            data-card-content="true"
            className={onLocate ? 'preview-locate' : undefined}
            onClick={(event) => {
              const found = onLocate && locate(event, event.currentTarget)
              if (found) onLocate(found)
            }}
          >
            <Site data={data} resolved={resolved} />
          </div>
        </DropZone>

        </div>
      </div>
    )
  }
