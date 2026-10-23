// Обработка сайта по профилю ниши после генерации (детерминированно, generate.ts): ниша, порядок и названия разделов,
// тема и accent по умолчанию. Разделы без данных не добавляются — только то, что модель уже написала.
import type { SectionNode } from '../ast.ts'
import { parseDocument } from '../parser.ts'
import type { BusinessName } from '../schema/frontmatter.ts'
import { NICHES, profileOf, type Slot } from './index.ts'

/** Коды в журнале (fixed_codes). */
export const BUSINESS_FIXED = 'business-fixed'
export const PROFILE_SECTIONS = 'profile-sections'
export const PROFILE_STYLE = 'profile-style'

export interface ProfileResult {
  text: string
  applied: string[]
}

/** Ставит скалярное поле шапки: заменяет строку или добавляет в конец шапки. */
export function setFrontmatterField(text: string, key: string, value: string): string {
  const frontmatter = parseDocument(text).frontmatter
  if (!frontmatter) return text
  const line = `${key}: ${value}`
  const field = frontmatter.fields.find((f) => f.key === key)
  if (field) {
    const newline = text.indexOf('\n', field.keyRange.from)
    return text.slice(0, field.keyRange.from) + line + text.slice(newline === -1 ? text.length : newline)
  }
  const end = frontmatter.yamlFrom + frontmatter.yamlText.length
  return `${text.slice(0, end)}\n${line}${text.slice(end)}`
}

const fieldOf = (text: string, key: string): string | undefined => {
  const value = parseDocument(text).frontmatter?.data[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Ниша сайта. Выбрал пользователь — ставится она. Не выбрал — не угадываем: названная моделью ниша остаётся, только
 * если слова этой ниши есть в описании, иначе «other». Если модель business не написала, поле не добавляем (промпт просит
 * писать other, когда ниша не названа): сайт без ниши остаётся без профиля.
 */
export function resolveBusiness(text: string, requested: BusinessName | undefined, description: string): ProfileResult {
  const current = fieldOf(text, 'business')
  let target: BusinessName
  if (requested) target = requested
  else if (current && NICHES.some((niche) => niche.business === current)) target = profileOf(current)!.matches(description) ? (current as BusinessName) : 'other'
  else if (current === 'other' || !current) return { text, applied: [] }
  else target = 'other' // незнакомое значение business
  if (target === current) return { text, applied: [] }
  return { text: setFrontmatterField(text, 'business', target), applied: [BUSINESS_FIXED] }
}

const BLOCK_SLOTS: Record<string, Slot> = {
  services: 'services',
  hours: 'hours',
  reviews: 'reviews',
  accordion: 'accordion',
  map: 'map',
  contacts: 'contacts',
}
/** Слоты до «хвоста»: разделы вне профиля («Адреса», «Удобства») встают после них и перед отзывами */
const HEAD_SLOTS: ReadonlySet<Slot> = new Set(['about', 'services', 'hours'])

/** Раздел профиля по блоку; первый текстовый раздел с заголовком — «о себе». Остальное — вне профиля. */
function slotsOf(sections: SectionNode[]): Map<SectionNode, Slot> {
  const slots = new Map<SectionNode, Slot>()
  const taken = new Set<Slot>()
  for (const section of sections) {
    if (!section.headingRange) continue
    const slot: Slot | undefined = section.blocks.length
      ? BLOCK_SLOTS[section.blocks[0].name]
      : section.content.trim()
        ? 'about'
        : undefined
    if (slot && !taken.has(slot)) {
      slots.set(section, slot)
      taken.add(slot)
    }
  }
  return slots
}

/** Порядок и названия разделов по профилю. Разделов не добавляет и не удаляет. */
export function applySectionOrder(text: string, business: string | undefined): ProfileResult {
  const profile = profileOf(business)
  if (!profile) return { text, applied: [] }
  const ast = parseDocument(text)
  const sections = ast.sections.filter((s) => s.headingRange)
  if (!sections.length) return { text, applied: [] }
  const slots = slotsOf(ast.sections)
  const order = profile.sections.map((s) => s.slot)

  const matched = [...slots.entries()].sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]))
  const unmatched = sections.filter((s) => !slots.has(s))
  const head = matched.filter(([, slot]) => HEAD_SLOTS.has(slot))
  const tail = matched.filter(([, slot]) => !HEAD_SLOTS.has(slot))
  const sequence = [...head, ...unmatched.map((s) => [s, null] as const), ...tail]

  const titleFor = (section: SectionNode, slot: Slot | null) =>
    slot && profile.renameSections ? profile.sections.find((s) => s.slot === slot)!.title : section.title
  const sameOrder = sequence.every(([section], i) => section === sections[i])
  const sameTitles = sequence.every(([section, slot]) => titleFor(section, slot) === section.title)
  if (sameOrder && sameTitles) return { text, applied: [] }

  const preamble = text.slice(0, sections[0].from).replace(/\s+$/, '')
  const pieces = sequence.map(([section, slot]) => {
    const raw = text.slice(section.from, section.to)
    const heading = section.headingRange!
    const title = titleFor(section, slot)
    const body = title === section.title ? raw : `## ${title}${raw.slice(heading.to - section.from)}`
    return body.replace(/\s+$/, '')
  })
  return { text: `${preamble}\n\n${pieces.join('\n\n')}\n`, applied: [PROFILE_SECTIONS] }
}

/** theme и accent ниши — только если модель не задала (нет поля или auto). */
export function applyStyle(text: string, business: string | undefined): ProfileResult {
  const profile = profileOf(business)
  if (!profile || (!profile.theme && !profile.accent)) return { text, applied: [] }
  let result = text
  const unset = (key: string) => {
    const value = fieldOf(result, key)
    return value === undefined || value === 'auto' || value.trim() === ''
  }
  let changed = false
  if (profile.theme && unset('theme')) {
    result = setFrontmatterField(result, 'theme', profile.theme)
    changed = true
  }
  if (profile.accent && unset('accent')) {
    result = setFrontmatterField(result, 'accent', `"${profile.accent}"`)
    changed = true
  }
  return { text: result, applied: changed ? [PROFILE_STYLE] : [] }
}

/** Ниша → порядок и названия разделов → тема и accent. */
export function applyNicheProfile(text: string, requested: BusinessName | undefined, description: string): ProfileResult {
  const business = resolveBusiness(text, requested, description)
  const order = applySectionOrder(business.text, fieldOf(business.text, 'business'))
  const style = applyStyle(order.text, fieldOf(order.text, 'business'))
  return { text: style.text, applied: [...business.applied, ...order.applied, ...style.applied] }
}
