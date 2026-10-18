// Незакрытые блоки `:::` и блок, открытый внутри другого (обычно — предыдущий забыли закрыть).
import { FENCE_OPEN } from '../sections.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

const HEADING = /^##(\s|$)/

export const unclosedFenceRule: Rule = ({ text, ast }) => {
  const diagnostics: Diagnostic[] = []

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      // Строки тела блока с позициями
      const lines: { from: number; text: string }[] = []
      let offset = block.bodyRange.from
      for (const line of text.slice(block.bodyRange.from, block.bodyRange.to).split('\n')) {
        lines.push({ from: offset, text: line })
        offset += line.length + 1
      }

      if (!block.closeRange) {
        // Закрываем перед первым «проглоченным» заголовком, иначе — в конце документа
        const heading = lines.find((line) => HEADING.test(line.text))
        const at = heading ? heading.from : text.length
        const replace = heading ? ':::\n' : text.endsWith('\n') ? ':::\n' : '\n:::'
        diagnostics.push({
          ...block.openRange,
          severity: 'error',
          code: 'unclosed-fence',
          message: `Блок :::${block.name} не закрыт — всё, что ниже, попадёт в него. Добавьте строку ::: в конце блока`,
          fix: { label: 'Закрыть блок', replace, from: at, to: at },
        })
      }

      for (const line of lines) {
        if (!FENCE_OPEN.test(line.text)) continue
        diagnostics.push({
          from: line.from,
          to: line.from + line.text.trimEnd().length,
          severity: 'error',
          code: 'nested-fence',
          message: `Новый блок начинается внутри :::${block.name} — похоже, предыдущий блок не закрыт строкой :::`,
          fix: { label: 'Закрыть предыдущий блок', replace: ':::\n', from: line.from, to: line.from },
        })
      }
    }
  }

  return diagnostics
}
