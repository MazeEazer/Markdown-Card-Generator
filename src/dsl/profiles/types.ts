// Профили ниш: каркас сайта для барбершопа, репетитора, маникюра, фотографа и «другого». Данные, без кода обработки.
// Профиль — не шаблон с готовым текстом: он задаёт порядок и названия разделов, оформление и «важное для ниши»,
// а заполняется только тем, что есть в описании.
import type { ThemeName } from '../../types/card.ts'
import type { BusinessName } from '../schema/frontmatter.ts'

/** Раздел профиля узнаётся по блоку: services, hours, reviews, accordion, map, contacts; about — первый текстовый раздел. */
export type Slot = 'about' | 'services' | 'hours' | 'reviews' | 'accordion' | 'map' | 'contacts'

export interface ProfileSection {
  slot: Slot
  /** Название раздела на сайте — как в шаблоне ниши */
  title: string
  /** Попадает в промпт. Отзывы и вопросы — нет: модель тянется заполнить раздел из списка, а код их не проверяет */
  inPrompt: boolean
  /** Подсказка редактора, если раздела нет: чаще всего указывают это */
  expected?: { hint: string }
}

export interface NicheProfile {
  business: BusinessName
  /** «барбершопа» — для подсказки «для барбершопа обычно указывают …» */
  genitive: string
  /** Порядок разделов; названия переименовываются только если `renameSections` */
  sections: ProfileSection[]
  /** Названия и порядок разделов принудительно (у «другого» названия модели не трогаем) */
  renameSections: boolean
  /** Оформление по умолчанию — ставится, только если модель не задала (нет или auto) */
  theme?: ThemeName
  accent?: string
  /** Тип Schema.org для JSON-LD */
  schemaType: string | string[]
  /** Дополнительные свойства JSON-LD (например, knowsAbout) */
  schemaExtra?: Record<string, unknown>
  /** «Важное для ниши» в промпте: без названий, цен и примеров, которые могли бы утечь на сайты */
  important: string[]
  /** Слова ниши в описании: подтверждают, что ниша названа (matcher) */
  matches: (description: string) => boolean
}
