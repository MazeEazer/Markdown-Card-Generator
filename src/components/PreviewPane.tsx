import type { CardData, ResolvedTheme } from '../types/card'
import { THEMES } from '../themes'

interface PreviewPaneProps {
  data: CardData
  resolved: ResolvedTheme
}

export function PreviewPane({ data, resolved }: PreviewPaneProps) {
  const ThemeComponent = THEMES[resolved.theme]

  return (
    <div className="h-full overflow-hidden bg-zinc-200 dark:bg-zinc-900">
      <div className="px-4 py-2 border-b border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500 font-mono flex items-center justify-between">
        <span>preview · {resolved.theme}</span>
        <span className="hidden sm:inline" style={{ color: resolved.colors.accent }}>
          {resolved.colors.accent}
        </span>
      </div>
      <div className="h-[calc(100%-33px)] overflow-auto">
        <ThemeComponent data={data} colors={resolved.colors} />
      </div>
    </div>
  )
}
