import { writeFileSync } from 'node:fs'
import { defaultTemplate } from './src/data/defaultTemplate'
import { exportHtml } from './src/lib/exportHtml'
import { TOKEN_COLORS } from './src/lib/highlight'
import { parseCardMarkdown } from './src/lib/parser'
import { resolveTheme } from './src/lib/themeEngine'
import type { ThemeName } from './src/types/card'

let failures = 0
function check(label: string, ok: boolean): void {
  console.log(`${ok ? '✓' : ' '} ${label}`)
  if (!ok) failures++
}

const HEX = /#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?/g
/** Все НЕ серые цвета в разметке (r, g, b попарно равны ⇒ оттенок серого) */
function coloredHexes(html: string): string[] {
  const found: string[] = []
  for (const match of html.matchAll(HEX)) {
    const channels = [match[1].slice(0, 2), match[1].slice(2, 4), match[1].slice(4, 6)].map((c) => c.toLowerCase())
    if (!(channels[0] === channels[1] && channels[1] === channels[2])) found.push(match[0].toLowerCase())
  }
  return [...new Set(found)]
}

const isGray = (color: string): boolean => {
  const hex = color.replace('#', '')
  return (
    hex.slice(0, 2).toLowerCase() === hex.slice(2, 4).toLowerCase() &&
    hex.slice(2, 4).toLowerCase() === hex.slice(4, 6).toLowerCase()
  )
}

const md = (frontmatter: string, body: string): string => `---\nname: Тест\n${frontmatter}\n---\n\n${body}\n`

// --- 1. Парсинг accent -----------------------------------------------------
const accentOf = (line: string): string | undefined => parseCardMarkdown(md(line, '## О себе\nПривет')).data?.accent
check('accent: "#ff5500" сохраняется', accentOf('accent: "#ff5500"') === '#ff5500')
check('accent: 3 знака → 6 (#abc → #aabbcc)', accentOf('accent: "#abc"') === '#aabbcc')
check('accent: 8 знаков → без альфы', accentOf('accent: "#ff550080"') === '#ff5500')
check('accent: верхний регистр → нижний', accentOf('accent: "#FF5500"') === '#ff5500')
check('accent: авто по умолчанию', accentOf('theme: auto') === 'auto')
check('accent: мусор → auto', accentOf('accent: red') === 'auto')
check('accent: пустое → auto', accentOf('accent: ""') === 'auto')

// короткий hex не должен ломать альфа-суффиксы (#abc18 — невалидный CSS)
const shortAccent = parseCardMarkdown(
  md('theme: glass\naccent: "#abc"', '## Проекты\n\n:::cards\ntitle: A\ndescription: B\nurl: https://example.com\n:::'),
).data!
const shortHtml = exportHtml(shortAccent, resolveTheme(shortAccent)).html
check('короткий accent применён (#aabbcc0f)', shortHtml.includes('#aabbcc0f') && shortHtml.includes('#aabbcc26'))
// валидные длины hex: #abc (4), #aabbcc (7), #aabbcc18 (9) — иной хвост = сломанный CSS
const invalidHex = [...shortHtml.matchAll(/#[0-9a-fA-F]+/g)]
  .map((m) => m[0])
  .filter((hex) => ![4, 7, 9].includes(hex.length))
check('короткий accent: нет hex невалидной длины', invalidHex.length === 0)
console.log('  невалидные hex:', invalidHex.join(', ') || 'нет')

// --- 2. Палитра Vercel монохромная ----------------------------------------
const template = parseCardMarkdown(defaultTemplate).data!
const vercel = resolveTheme(template, 'vercel')
const glass = resolveTheme(template, 'glass')

check('vercel: тема выбрана', vercel.theme === 'vercel')
check('vercel: accent = #ffffff', vercel.colors.accent.toLowerCase() === '#ffffff')
check(
  'vercel: все цвета палитры — оттенки серого',
  [...Object.values(vercel.colors), vercel.colors.background].every(isGray),
)
check('glass: accent цветной (из имени)', !isGray(glass.colors.accent))
console.log(`  glass accent: ${glass.colors.accent} · vercel accent: ${vercel.colors.accent}`)

// --- 3. Кастомный accent: игнорируется в Vercel, работает в других ---------
const customVercel = parseCardMarkdown(md('theme: vercel\naccent: "#ff0000"', '## О себе\nПривет')).data!
const customGlass = parseCardMarkdown(md('theme: glass\naccent: "#ff0000"', '## О себе\nПривет')).data!
check('vercel: кастомный accent игнорируется', resolveTheme(customVercel).colors.accent === '#ffffff')
check('vercel: кастомный accent игнорируется и при override', resolveTheme(customVercel, 'vercel').colors.accent === '#ffffff')
check('glass: кастомный accent применяется', resolveTheme(customGlass).colors.accent === '#ff0000')
check(
  'glass: переключение на Vercel убирает цвет',
  resolveTheme(customGlass, 'vercel').colors.accent === '#ffffff',
)

// --- 4. Экспорт: Vercel без цвета из имени ---------------------------------
const vercelHtml = exportHtml(template, vercel).html
const glassHtml = exportHtml(template, glass).html
writeFileSync('.tmp-vercel-mono.html', vercelHtml)

check('vercel: цвета из имени нет в HTML', !vercelHtml.toLowerCase().includes(glass.colors.accent.toLowerCase()))
check('glass: цвет из имени есть в HTML', glassHtml.toLowerCase().includes(glass.colors.accent.toLowerCase()))
check('vercel: белый акцент в CSS-переменных', vercelHtml.includes('--accent: #ffffff'))

// Структура карточек/таблиц/аккордеона рисуется альфа-оттенками белого
check('vercel: бордер карточки #ffffff26', vercelHtml.includes('#ffffff26'))
check('vercel: фон карточки #ffffff0f', vercelHtml.includes('#ffffff0f'))
check('vercel: рамка таблицы/кода #ffffff33', vercelHtml.includes('#ffffff33'))
check('vercel: белый глоу hero', vercelHtml.includes('#ffffff14'))

// --- 5. Единственные цвета в Vercel-экспорте — это подсветка кода ----------
const tokenHexes = new Set(Object.values(TOKEN_COLORS).map((c) => c.toLowerCase()))
const colored = coloredHexes(vercelHtml)
const stray = colored.filter((hex) => !tokenHexes.has(hex.slice(0, 7)))
check('vercel: цветными остались только токены кода', stray.length === 0)
console.log('  цветное в vercel:', colored.join(', ') || 'нет')
console.log('  цветное в glass: ', coloredHexes(glassHtml).join(', ') || 'нет')

// «светофоры» кодового блока тоже нейтральные в монохромной теме
check('vercel: серые «светофоры» кода', vercelHtml.includes('#3f3f3f') && vercelHtml.includes('#6f6f6f'))
check('glass: цветные «светофоры» кода', glassHtml.includes('#ff5f56') && glassHtml.includes('#27c93f'))

// --- 6. Инициалы (нет avatar → фолбэк с инициалами) ------------------------
const noAvatar = parseCardMarkdown(md('', '## О себе\nПривет')).data!
const initialsColor = (theme: ThemeName): string | undefined =>
  /background:var\(--accent\);color:(#[0-9a-f]{6})/.exec(exportHtml(noAvatar, resolveTheme(noAvatar, theme)).html)?.[1]
check('vercel: инициалы тёмные на белом', initialsColor('vercel') === '#000000')
check('glass: инициалы белые на акценте', initialsColor('glass') === '#ffffff')

console.log(failures === 0 ? '\nMONOCHROME CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1