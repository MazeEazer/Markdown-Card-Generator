// Услуги: цена числом, без повторов, с описанием.
import { isValidPrice, normalizePrice } from '../price.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

export const servicesRule: Rule = ({ ast }) => {
  const diagnostics: Diagnostic[] = []
  // Повторы ищем во всех блоках услуг документа: одна и та же услуга в двух разделах — тоже повтор
  const seen = new Set<string>()

  for (const block of ast.sections.flatMap((section) => section.blocks)) {
    if (block.name !== 'services') continue

    for (const item of block.items) {
      const field = (key: string) => item.fields.find((f) => f.key === key)
      const title = field('title')
      const price = field('price')

      if (price?.value && !isValidPrice(price.value)) {
        const fixed = normalizePrice(price.value)
        diagnostics.push({
          ...price.valueRange,
          severity: 'warning',
          code: 'price-not-number',
          message: fixed
            ? `Цену пишите числом, без валюты: ${fixed}. Знак ₽ сайт добавит сам (валюта — поле currency в шапке)`
            : 'Цену пишите числом: 1500, «от 1500» или «1500–2000»; валюта задаётся в шапке полем currency',
          fix: fixed ? { label: `Заменить на ${fixed}`, replace: fixed } : undefined,
        })
      }

      if (!title?.value) continue
      const key = title.value.trim().toLowerCase()
      if (seen.has(key)) {
        diagnostics.push({
          ...title.valueRange,
          severity: 'warning',
          code: 'duplicate-service',
          message: `Услуга «${title.value}» уже есть выше — клиенту будет непонятно, какая цена верная`,
        })
      }
      seen.add(key)

      if (!field('description')?.value) {
        diagnostics.push({
          ...title.valueRange,
          severity: 'info',
          code: 'service-no-description',
          message: 'У услуги нет описания: одна-две фразы о том, что входит, помогут клиенту выбрать (поле description)',
        })
      }
    }
  }

  return diagnostics
}
