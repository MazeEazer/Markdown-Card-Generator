// contacts.primary ведёт на способ связи, который не указан.
import { PRIMARY_TARGETS } from '../schema/frontmatter.ts'
import type { Rule } from '../validate.ts'
import { businessFields } from './helpers.ts'

const NAMES: Record<string, string> = {
  phone: 'звонок',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  vk: 'ВКонтакте',
  max: 'MAX',
  instagram: 'Instagram',
  email: 'почту',
  website: 'сайт',
}

export const primaryRule: Rule = ({ ast }) => {
  const { root, contacts } = businessFields(ast.frontmatter)
  const primary = contacts.get('primary')
  // Недопустимое значение — забота правила invalid-value
  if (!primary || !(PRIMARY_TARGETS as readonly string[]).includes(primary.value)) return []

  const available = [...contacts.keys()].filter((key) => key !== 'primary')
  if (root.has('phone')) available.push('phone')
  if (available.includes(primary.value)) return []

  const where = primary.value === 'phone' ? 'телефон (phone) не указан' : `${primary.value} не указан в contacts`
  return [
    {
      ...primary.valueRange,
      severity: 'warning',
      code: 'primary-unknown',
      message: `Главная кнопка ведёт на ${NAMES[primary.value]}, но ${where}`,
      // Единственный указанный способ связи — очевидная замена
      fix: available.length === 1 ? { label: `Заменить на ${available[0]}`, replace: available[0] } : undefined,
    },
  ]
}
