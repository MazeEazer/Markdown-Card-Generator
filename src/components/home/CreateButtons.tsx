// Две кнопки создания сайта: главная — с ИИ (чёрная), вторая — из шаблона (белая с рамкой).
// Одинаковы на первом экране и над списком сайтов; в списке — компактнее (layout="row").
import { CREATE_AI, CREATE_TEMPLATE } from './copy'

interface CreateButtonsProps {
  onAi: () => void
  onTemplate: () => void
  layout?: 'stack' | 'row'
}

export function CreateButtons({ onAi, onTemplate, layout = 'stack' }: CreateButtonsProps) {
  const grid = layout === 'row' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'
  return (
    <div className={grid}>
      <button type="button" onClick={onAi} className="ui-btn-primary w-full flex-col items-start gap-1 px-5 py-4 text-left">
        <span className="flex w-full items-center justify-between gap-3 text-base font-semibold">
          {CREATE_AI.label}
          <span className="rounded-full border border-white/30 px-2 py-0.5 font-geist-mono text-[11px] font-medium leading-none">ИИ</span>
        </span>
        <span className="text-sm font-normal text-white/70">{CREATE_AI.hint}</span>
      </button>
      <button type="button" onClick={onTemplate} className="ui-btn-secondary w-full flex-col items-start gap-1 px-5 py-4 text-left">
        <span className="text-base font-semibold">{CREATE_TEMPLATE.label}</span>
        <span className="text-sm font-normal text-ink-muted">{CREATE_TEMPLATE.hint}</span>
      </button>
    </div>
  )
}
