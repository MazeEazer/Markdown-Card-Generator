import type { CardData, ResolvedTheme } from '../types/card'
import { THEME_FONTS } from './fonts'
import { THEMES } from './index'
import { ContactBar } from './shared/ContactBar'

/**
 * Сайт целиком: тема и панель связи. Панель — снаружи темы: корни тем прокручиваемые (overflow: auto),
 * и закреплённая внутри них панель прилипала бы к концу страницы, а не к низу экрана.
 * Обёртка .md-site — контейнер для правила @container: панель видна, когда узок сам сайт, а не окно браузера.
 */
export function Site({ data, resolved }: { data: CardData; resolved: ResolvedTheme }) {
  const Theme = THEMES[resolved.theme]
  return (
    <div className="md-site">
      <Theme data={data} colors={resolved.colors} />
      <ContactBar card={data} colors={resolved.colors} font={THEME_FONTS[resolved.theme]} />
    </div>
  )
}
