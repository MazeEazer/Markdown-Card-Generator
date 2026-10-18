// Блок :::contacts показывает контакты из шапки: предупреждаем, если показать нечего или внутри написан текст.
import { toCardData } from '../cardData.ts'
import { contactLinks } from '../contactLinks.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

export const contactsBlockRule: Rule = ({ text, ast }) => {
  const blocks = ast.sections.flatMap((section) => section.blocks).filter((block) => block.name === 'contacts')
  if (!blocks.length) return []

  const card = toCardData(ast).data
  const empty = card !== null && !contactLinks(card).length && !card.address

  return blocks.flatMap((block): Diagnostic[] => {
    const diagnostics: Diagnostic[] = []
    if (empty) {
      diagnostics.push({
        ...block.nameRange,
        severity: 'warning',
        code: 'contacts-block-empty',
        message: 'В блоке «Контакты» нечего показать: добавьте в шапку phone, address или contacts',
      })
    }
    if (text.slice(block.bodyRange.from, block.bodyRange.to).trim()) {
      diagnostics.push({
        ...block.bodyRange,
        severity: 'info',
        code: 'contacts-block-text',
        message: 'Текст внутри :::contacts не показывается: блок берёт телефон, адрес и мессенджеры из шапки',
        fix: { label: 'Убрать текст из блока', replace: '' },
      })
    }
    return diagnostics
  })
}
