// Подсказка по профилю ниши: в шапке указана ниша, а типичного для неё раздела нет. Предупреждение, не ошибка:
// на сайт ничего не добавляется, нейросети такое замечание не отправляется (MISSING_DATA_CODES).
import { profileOf } from '../profiles/index.ts'
import type { Slot } from '../profiles/index.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

const SLOT_BLOCKS: Partial<Record<Slot, string>> = { services: 'services', hours: 'hours', map: 'map', contacts: 'contacts' }

export const profileRule: Rule = ({ ast }) => {
  const field = ast.frontmatter?.fields.find((f) => f.key === 'business')
  const profile = profileOf(typeof field?.value === 'string' ? field.value.trim() : undefined)
  if (!field?.valueRange || !profile?.renameSections) return []

  const blocks = new Set(ast.sections.flatMap((section) => section.blocks.map((block) => block.name)))
  const diagnostics: Diagnostic[] = []
  for (const section of profile.sections) {
    const block = SLOT_BLOCKS[section.slot]
    if (!section.expected || !block || blocks.has(block)) continue
    diagnostics.push({
      ...field.valueRange,
      severity: 'warning',
      code: 'profile-section-missing',
      message: `Для ${profile.genitive} обычно указывают ${section.expected.hint} — добавьте раздел «${section.title}»`,
    })
  }
  return diagnostics
}
