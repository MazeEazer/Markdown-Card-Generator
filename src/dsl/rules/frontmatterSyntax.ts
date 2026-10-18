// Синтаксис шапки: незакрытая шапка и ошибки YAML — с понятным сообщением вместо английского текста библиотеки.
import type { Diagnostic, DiagnosticFix, Range } from '../types.ts'
import type { Rule } from '../validate.ts'
import { indentBeforeFrontmatter, lineAt } from './helpers.ts'

/** Значение после первого `ключ: ` в строке, если в нём есть двоеточие. */
function valueWithColon(text: string, line: Range): Range | null {
  const match = text.slice(line.from, line.to).match(/^(\s*[^\s:#][^:#]*:\s+)(.*\S)\s*$/)
  if (!match || !match[2].includes(':') || /^["']/.test(match[2])) return null
  const from = line.from + match[1].length
  return { from, to: from + match[2].length }
}

function describe(code: string, text: string, range: Range): { message: string; fix?: DiagnosticFix } {
  const line = lineAt(text, range.from)

  switch (code) {
    case 'DUPLICATE_KEY': {
      const key = text.slice(line.from, line.to).split(':')[0].trim()
      return { message: `Поле «${key}» указано в шапке дважды — оставьте одно` }
    }
    case 'TAB_AS_INDENT':
      return {
        message: 'Отступ сделан клавишей Tab — в шапке нужны пробелы',
        fix: { label: 'Заменить на пробелы', replace: '  ', from: range.from, to: range.to },
      }
    case 'MISSING_CHAR':
      return { message: 'Не хватает закрывающей кавычки или скобки' }
    case 'BAD_SCALAR_START':
      // Частый случай: «telegram: @ivan» — @ в начале значения в YAML запрещён
      if (text[range.from] === '@') {
        return {
          message: 'Имя пользователя пишется без @',
          fix: { label: 'Убрать @', replace: '', from: range.from, to: range.from + 1 },
        }
      }
      return { message: 'Значение начинается с особого символа — возьмите его в кавычки' }
    case 'MULTIPLE_DOCS':
      return { message: 'Лишняя строка --- внутри шапки: шапка должна быть одна' }
    case 'BLOCK_AS_IMPLICIT_KEY': {
      const value = valueWithColon(text, line)
      if (value) {
        const quoted = `"${text.slice(value.from, value.to).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        return {
          message: 'В значении есть двоеточие — возьмите значение в кавычки',
          fix: { label: `Заменить на ${quoted}`, replace: quoted, ...value },
        }
      }
      break
    }
  }

  return { message: 'Ошибка в шапке: проверьте в этой строке отступы, двоеточие после названия поля и кавычки' }
}

export const frontmatterSyntaxRule: Rule = ({ text, ast }) => {
  const frontmatter = ast.frontmatter

  // Шапка есть, но не с первой строки — парсер её не видит; остальные проблемы шапки — после исправления
  const indent = indentBeforeFrontmatter(text)
  if (indent > 0) {
    return [
      {
        from: indent,
        to: indent + 3,
        severity: 'error',
        code: 'frontmatter-not-first',
        message: 'Шапка должна начинаться с первой строки: перед --- не должно быть пустых строк и пробелов',
        fix: { label: 'Убрать пустые строки в начале', replace: '', from: 0, to: indent },
      },
    ]
  }

  if (!frontmatter) {
    if (!/^---\r?\n/.test(text)) return []
    return [
      {
        ...lineAt(text, 0),
        severity: 'error',
        code: 'unclosed-frontmatter',
        message: 'Шапка не закрыта: после последнего поля шапки нужна строка ---',
      },
    ]
  }

  // Одна ошибка на строку: библиотека часто выдаёт по несколько на одну причину
  const seenLines = new Set<number>()
  const diagnostics: Diagnostic[] = []
  for (const error of frontmatter.errors) {
    const line = lineAt(text, error.from)
    if (seenLines.has(line.from)) continue
    seenLines.add(line.from)

    // Подчёркиваем всю строку: позиция ошибки YAML часто указывает на один символ, где разбор остановился
    diagnostics.push({ ...line, severity: 'error', code: 'invalid-yaml', ...describe(error.code, text, error) })
  }
  return diagnostics
}
