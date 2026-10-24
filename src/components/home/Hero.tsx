import { useRef } from 'react'
import { useParallax } from '../../hooks/useParallax'
import { HERO_SUBTITLE, HERO_TITLE } from './copy'
import { CreateButtons } from './CreateButtons'
import { SitePreviewCard } from './SitePreviewCard'

interface HeroProps {
  onAi: () => void
  onTemplate: () => void
}

/** Первый экран для новых пользователей: до входа и при пустом списке сайтов. Параллакс — сетка, заголовок, превью. */
export function Hero({ onAi, onTemplate }: HeroProps) {
  const root = useRef<HTMLElement>(null)
  useParallax(root)

  return (
    <section ref={root} className="relative overflow-hidden border-b border-line">
      <div className="ui-grid parallax-grid pointer-events-none absolute inset-0 -top-20" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
        <div className="parallax-title">
          <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">{HERO_TITLE}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">{HERO_SUBTITLE}</p>
          <div className="mt-8 max-w-md">
            <CreateButtons onAi={onAi} onTemplate={onTemplate} />
          </div>
        </div>
        <div className="parallax-preview">
          <SitePreviewCard />
        </div>
      </div>
    </section>
  )
}
