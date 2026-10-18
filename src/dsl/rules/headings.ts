// Строки, похожие на заголовок секции, которые парсер заголовком не считает.
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'

export const headingsRule: Rule = ({ text, ast }) => {
  const diagnostics: Diagnostic[] = []
  // Внутри блоков `:::` заголовков не бывает — там это обычный текст (например, код)
  const blocks = ast.sections.flatMap((section) => section.blocks)
  const insideBlock = (offset: number) => blocks.some((block) => offset > block.openRange.to && offset <= block.to)

  let offset = ast.bodyFrom
  for (const line of text.slice(ast.bodyFrom).split('\n')) {
    const from = offset
    offset += line.length + 1
    if (!line.startsWith('##') || insideBlock(from)) continue

    if (/^##[^\s#]/.test(line)) {
      diagnostics.push({
        from,
        to: from + line.trimEnd().length,
        severity: 'warning',
        code: 'heading-no-space',
        message: 'Это не заголовок раздела: после ## нужен пробел',
        fix: { label: 'Добавить пробел', replace: ' ', from: from + 2, to: from + 2 },
      })
    } else if (line.endsWith('\r') && /^##\s/.test(line) && line.trim() !== '##') {
      diagnostics.push({
        from,
        to: from + line.length - 1,
        severity: 'warning',
        code: 'crlf-heading',
        message: 'Заголовок не распознан из-за переводов строк в формате Windows',
        fix: { label: 'Исправить переводы строк во всём тексте', replace: text.replace(/\r\n/g, '\n'), from: 0, to: text.length },
      })
    }
  }

  return diagnostics
}
