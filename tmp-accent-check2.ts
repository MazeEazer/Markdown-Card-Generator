import { parseCardMarkdown } from './src/lib/parser.ts'

function t(label: string, accentLine: string): void {
  const md = `---\nname: Тест\naccent: ${accentLine}\n---\n\n## О себе\nПривет\n`
  const result = parseCardMarkdown(md)
  console.log(`${label.padEnd(16)} ⇒ accent=${JSON.stringify(result.data?.accent)} error=${result.error}`)
}

t('quoted hex', '"#ff5500"')
t('single hex', "'#ff5500'")
t('bare hex', '#ff5500')
t('auto', 'auto')
t('auto + comment', 'auto # палитра из имени')
t('named "red"', 'red')