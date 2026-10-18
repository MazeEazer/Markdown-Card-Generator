// Телефон и WhatsApp: российский номер в едином виде +7 999 123-45-67.
import { parseRussianPhone } from '../phone.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { businessFields, type TextField } from './helpers.ts'

/** Номер другой страны: «+» и не +7 — не трогаем, ссылка для звонка построится как есть. */
const FOREIGN = /^\+(?!7)[\d\s().-]+$/

function checkPhone(field: TextField, whatsapp: boolean): Diagnostic[] {
  const phone = parseRussianPhone(field.value)

  if (phone) {
    if (field.value === phone.display) return []
    return [
      {
        ...field.valueRange,
        severity: 'warning',
        code: 'phone-format',
        message: `Запишите номер в едином виде: ${phone.display}`,
        fix: { label: `Заменить на ${phone.display}`, replace: phone.display },
      },
    ]
  }

  if (FOREIGN.test(field.value)) return []

  return [
    whatsapp
      ? {
          ...field.valueRange,
          severity: 'warning',
          code: 'whatsapp-not-phone',
          message: 'В WhatsApp указывается номер телефона, к которому он привязан, например +7 999 123-45-67',
        }
      : {
          ...field.valueRange,
          severity: 'warning',
          code: 'phone-format',
          message: 'Не похоже на российский номер: нужно 10 цифр после +7, например +7 999 123-45-67',
        },
  ]
}

export const phoneRule: Rule = ({ ast }) => {
  const { root, contacts } = businessFields(ast.frontmatter)
  const phone = root.get('phone')
  const whatsapp = contacts.get('whatsapp')
  return [...(phone ? checkPhone(phone, false) : []), ...(whatsapp ? checkPhone(whatsapp, true) : [])]
}
