// Отзывы: оценка — целое число от 1 до 5.
import { normalizeRating, parseRating } from '../rating.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

export const reviewsRule: Rule = ({ ast }) => {
  const diagnostics: Diagnostic[] = []

  for (const block of ast.sections.flatMap((section) => section.blocks)) {
    if (block.name !== 'reviews') continue
    for (const item of block.items) {
      const rating = item.fields.find((field) => field.key === 'rating')
      if (!rating?.value || parseRating(rating.value) !== null) continue

      const fixed = normalizeRating(rating.value)
      diagnostics.push({
        ...rating.valueRange,
        severity: 'warning',
        code: 'rating-invalid',
        message: fixed
          ? `Оценку пишите числом от 1 до 5: ${fixed}. Звёзды сайт нарисует сам`
          : 'Оценка — целое число от 1 до 5. Сейчас она не покажется на сайте',
        fix: fixed ? { label: `Заменить на ${fixed}`, replace: String(fixed) } : undefined,
      })
    }
  }

  return diagnostics
}
