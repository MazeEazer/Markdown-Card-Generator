import { barbershop } from '../../data/templates/barbershop'
import { parseCardMarkdown } from '../../lib/parser'
import { resolveTheme } from '../../lib/themeEngine'

// Настоящий сайт из шаблона «Барбершоп» тем же рендером, что в превью редактора. Берём шапку и первые три раздела
// (О нас, услуги, часы): ниже карточка всё равно обрезана, а раздел с картой грузил бы внешний iframe.
const card = parseCardMarkdown(barbershop).data!
export const PREVIEW_CARD = { ...card, sections: card.sections.slice(0, 3) }
export const PREVIEW_RESOLVED = resolveTheme(PREVIEW_CARD)
