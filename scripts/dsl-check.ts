// Проверка файла на языке MD Card из терминала (Node.js 24+: TypeScript запускается без сборки).
//
//   npm run check:dsl -- сайт.md
//   pbpaste | npm run check:dsl            # текст из буфера обмена (macOS)
//
// Печатает найденные проблемы со строкой и колонкой. Код выхода 1 — если есть ошибки (error).
import { readFileSync } from 'node:fs'
import { offsetToLineCol } from '../src/dsl/position.ts'
import { validate } from '../src/dsl/validate.ts'

const SEVERITY = { error: 'ошибка', warning: 'внимание', info: 'совет' } as const

const file = process.argv[2]
const text = readFileSync(file && file !== '-' ? file : 0, 'utf8')
const name = file && file !== '-' ? file : 'stdin'
const diagnostics = validate(text)

for (const d of diagnostics) {
  const { line, column } = offsetToLineCol(text, d.from)
  console.log(`${name}:${line}:${column}  ${SEVERITY[d.severity]}  [${d.code}]`)
  console.log(`  ${d.message.replace(/\n/g, '\n  ')}`)
  if (d.fix) console.log(`  Исправление: ${d.fix.label}`)
}

const errors = diagnostics.filter((d) => d.severity === 'error').length
console.log(diagnostics.length ? `\nНайдено: ${diagnostics.length}, из них ошибок: ${errors}` : 'Проблем не найдено')
process.exitCode = errors ? 1 : 0
