import { type RefObject, useEffect } from 'react'
import { parallaxOffset } from '../lib/parallax'

/**
 * Пишет прокрутку страницы в CSS-переменную --parallax элемента — без библиотек: один слушатель прокрутки
 * и не больше одного обновления за кадр. При prefers-reduced-motion слушатель не подключается вовсе.
 */
export function useParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    const update = () => {
      frame = 0
      element.style.setProperty('--parallax', String(parallaxOffset(window.scrollY, element.offsetHeight, motion.matches)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const subscribe = () => {
      window.removeEventListener('scroll', onScroll)
      if (!motion.matches) window.addEventListener('scroll', onScroll, { passive: true })
      update()
    }

    subscribe()
    // Настройку «уменьшить движение» могут включить, не уходя со страницы
    motion.addEventListener('change', subscribe)
    return () => {
      window.removeEventListener('scroll', onScroll)
      motion.removeEventListener('change', subscribe)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])
}
