// Карта без адреса: показать нечего (одного города мало — карта покажет весь город).
import { toCardData } from '../cardData.ts'
import { mapQuery } from '../mapLinks.ts'
import type { Rule } from '../validate.ts'

export const mapRule: Rule = ({ ast }) => {
  const card = toCardData(ast).data
  if (!card) return []

  return ast.sections.flatMap((section) =>
    section.blocks
      .filter((block) => block.name === 'map')
      .filter((block) => {
        const own = block.items[0]?.fields.find((field) => field.key === 'address')?.value
        return !mapQuery(card, own || undefined)
      })
      .map((block) => ({
        ...block.nameRange,
        severity: 'warning' as const,
        code: 'map-no-address',
        message: card.city
          ? `Для карты нужен адрес, одного города мало — карта покажет весь ${card.city}. Добавьте в шапку address: улица, дом`
          : 'Для карты нужен адрес: добавьте в шапку city: город и address: улица, дом',
      })),
  )
}
