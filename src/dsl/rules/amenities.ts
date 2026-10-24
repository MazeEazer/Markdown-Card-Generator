// Удобства: key — только из списка (с подсказкой ближайшего), одно удобство — один раз.
import { AMENITY_ALIASES, AMENITY_KEYS } from '../schema/amenities.ts'
import { suggest } from '../suggest.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { didYouMean } from './helpers.ts'

export const amenitiesRule: Rule = ({ ast }) => {
  const diagnostics: Diagnostic[] = []

  for (const block of ast.sections.flatMap((section) => section.blocks)) {
    if (block.name !== 'amenities') continue
    const seen = new Set<string>()
    for (const item of block.items) {
      const field = item.fields.find((f) => f.key === 'key')
      const value = field?.value.trim()
      if (!field || !value) continue

      if (!(AMENITY_KEYS as readonly string[]).includes(value)) {
        const suggestion = suggest(value, AMENITY_KEYS, AMENITY_ALIASES)
        const { hint, fix } = suggestion ? didYouMean(suggestion) : { hint: `Можно: ${AMENITY_KEYS.join(', ')}`, fix: undefined }
        diagnostics.push({
          ...field.valueRange,
          severity: 'error',
          code: 'amenity-unknown-key',
          message: `Неизвестное удобство «${value}». ${hint}`,
          fix,
        })
      } else if (seen.has(value)) {
        diagnostics.push({
          ...field.valueRange,
          severity: 'warning',
          code: 'amenity-duplicate',
          message: `Удобство «${value}» уже есть в этом блоке — второе покажется ещё раз`,
        })
      }
      seen.add(value)
    }
  }

  return diagnostics
}
