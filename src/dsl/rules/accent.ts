// Цвет accent: `#abc` без кавычек YAML считает комментарием, а необычную запись цвета парсер молча исправляет.
// Цвет — это и цвет текста на сайте: на фоне темы он должен читаться (контраст по WCAG).
import { parseAccent } from '../cardData.ts'
import { contrast, MIN_TEXT_CONTRAST, readableAccent } from '../color.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { lineAt, yamlValue } from './helpers.ts'

const CANONICAL = /^(auto|#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?)$/

/**
 * Фон, на котором цвет становится текстом (цены, ссылки), — по теме из шапки. vercel цвет не использует,
 * у auto тема выбирается при показе — их не проверяем.
 */
const TEXT_BACKGROUND: Record<string, { color: string; label: string }> = {
  minimal: { color: '#ffffff', label: 'светлом' },
  glass: { color: '#ffffff', label: 'светлом' },
  noir: { color: '#14141f', label: 'тёмном' },
}

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
  if (CANONICAL.test(value)) {
    const theme = String(yamlValue(frontmatter.yaml.get('theme', true) as never) ?? '').trim()
    const background = TEXT_BACKGROUND[theme]
    if (value === 'auto' || !background) return []
    const ratio = contrast(value, background.color)
    if (ratio >= MIN_TEXT_CONTRAST) return []
    const readable = readableAccent(value, background.color)
    return [
      {
        ...field.valueRange,
        severity: 'warning',
        code: 'accent-low-contrast',
        message: `Цвет плохо читается на ${background.label} фоне темы ${theme}: контраст ${ratio.toFixed(1).replace('.', ',')} : 1, нужно не меньше 4,5 : 1 — цены и ссылки будет трудно прочитать. Тот же оттенок, но читаемый: "${readable}"`,
        fix: { label: `Заменить на "${readable}"`, replace: `"${readable}"` },
      },
    ]
  }

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
