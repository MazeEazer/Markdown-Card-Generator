// Имена пользователей в contacts: ссылка или @имя вместо имени, правила имени в Telegram.
import { telegramUsernameProblem, USERNAME_CONTACTS, usernameFromLink } from '../contacts.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { businessFields } from './helpers.ts'

export const contactUsernameRule: Rule = ({ ast }) => {
  const diagnostics: Diagnostic[] = []
  const { contacts } = businessFields(ast.frontmatter)

  for (const contact of USERNAME_CONTACTS) {
    const field = contacts.get(contact)
    if (!field) continue

    const username = usernameFromLink(contact, field.value)
    if (username) {
      diagnostics.push({
        ...field.valueRange,
        severity: 'warning',
        code: 'contact-link',
        message: 'Укажите только имя пользователя — ссылку сайт построит сам',
        fix: { label: `Заменить на ${username}`, replace: username },
      })
    }

    if (contact === 'telegram') {
      const name = username ?? field.value
      const problem = telegramUsernameProblem(name)
      if (problem) {
        diagnostics.push({
          ...field.valueRange,
          severity: 'warning',
          code: 'telegram-username',
          message: `Имя «${name}» не подходит для Telegram: ${problem}`,
        })
      }
    }
  }

  return diagnostics
}
