import { useLayoutEffect, useRef, useState } from 'react'
import { Site } from '../../themes/Site'
import { PREVIEW_CARD, PREVIEW_RESOLVED } from './previewCard'

/** Ширина, на которой рисуется сайт: как превью редактора на ноутбуке; дальше карточка его уменьшает. */
const RENDER_WIDTH = 720

/** Уменьшенный неинтерактивный сайт в рамке окна браузера — для первого экрана. */
export function SitePreviewCard() {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const fit = () => setScale(element.clientWidth / RENDER_WIDTH)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <figure className="ui-panel overflow-hidden" aria-label="Пример сайта: барбершоп «Борода»">
      <div className="flex items-center gap-1.5 border-b border-line bg-wash px-3 py-2">
        <span className="size-2.5 rounded-full border border-line-strong" />
        <span className="size-2.5 rounded-full border border-line-strong" />
        <span className="size-2.5 rounded-full border border-line-strong" />
        <span className="ml-2 truncate font-geist-mono text-xs text-ink-muted">boroda.mdcard.site</span>
      </div>
      <div ref={frame} className="relative h-[340px] overflow-hidden sm:h-[420px]" aria-hidden inert>
        <div className="pointer-events-none absolute left-0 top-0 origin-top-left select-none" style={{ width: RENDER_WIDTH, transform: `scale(${scale})` }}>
          <Site data={PREVIEW_CARD} resolved={PREVIEW_RESOLVED} />
        </div>
      </div>
    </figure>
  )
}
