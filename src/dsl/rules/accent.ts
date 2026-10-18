// Цвет accent: `#abc` без кавычек YAML считает комментарием, а необычную запись цвета парсер молча исправляет.
import { parseAccent } from '../cardData.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { lineAt, yamlValue } from './helpers.ts'

const CANONICAL = /^(auto|#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?)$/

export const accentRule: Rule = ({ text, ast }) => {
  const frontmatter = ast.frontmatter
  const field = frontmatter?.fields.find((f) => f.key === 'accent')
  if (!frontmatter || frontmatter.errors.length || !field) return []

  if (!field.valueRange) {
    const line = lineAt(text, field.keyRange.from)
    const rest = text.slice(field.keyRange.to, line.to)
    const match = rest.match(/^\s*:\s*(#[0-9a-fA-F]{3,8})\b/)
    if (!match) return []
    const from = field.keyRange.to + rest.indexOf(match[1])
    const quoted = `"${match[1]}"`
    return [
      {
        from,
        to: from + match[1].length,
        severity: 'warning',
        code: 'accent-unquoted',
        message: 'Цвет нужно взять в кавычки: без них знак # начинает комментарий, и цвет не применится',
        fix: { label: `Заменить на ${quoted}`, replace: quoted },
      },
    ]
  }

  const value = String(yamlValue(frontmatter.yaml.get('accent', true) as never) ?? '').trim()
  if (CANONICAL.test(value)) return []

  const parsed = parseAccent(value)
  const diagnostic: Diagnostic =
    parsed !== 'auto'
      ? {
          ...field.valueRange,
          severity: 'warning',
          code: 'accent-format',
          message: `Цвет записан необычно — сайт поймёт его как ${parsed}. Лучше записать так: "${parsed}"`,
          fix: { label: `Заменить на "${parsed}"`, replace: `"${parsed}"` },
        }
      : {
          ...field.valueRange,
          severity: 'warning',
          code: 'invalid-value',
          message: `Цвет «${value}» не распознан — цвет подберётся автоматически. Укажите его в виде "#rrggbb", например "#c0392b"`,
        }
  return [diagnostic]
}
