// Значения, не подходящие под схему: тема, вид бизнеса, ссылки, почта, иконки, primary.
// Цвет accent проверяет отдельное правило accent.ts.
import { isMap, isSeq } from 'yaml'
import { z } from 'zod'
import type { FrontmatterNode } from '../ast.ts'
import { BLOCKS, type BlockName } from '../schema/blocks.ts'
import { CONTACT_ALIASES, contactsSchema, frontmatterSchema } from '../schema/frontmatter.ts'
import { suggest } from '../suggest.ts'
import type { Diagnostic, DiagnosticFix, Range } from '../types.ts'
import type { Rule } from '../validate.ts'
import { didYouMean, enumOptions, unwrap, yamlItems, yamlPairs, yamlValue } from './helpers.ts'

const linkSchema = (unwrap(frontmatterSchema.shape.links) as z.ZodArray<z.ZodObject>).element

/** Похоже на адрес сайта без https:// — `example.ru`, `t.me/ivan`. */
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/

function explain(key: string, value: unknown, schema: z.ZodType): { message: string; fix?: DiagnosticFix } {
  const inner = unwrap(schema)
  const options = enumOptions(inner)

  if (options) {
    const shown = typeof value === 'string' ? value : JSON.stringify(value)
    const normalized = typeof value === 'string' ? value.split('#')[0].trim().toLowerCase() : ''
    const message = `Значение «${shown}» не подходит для поля «${key}».`
    if (options.includes(normalized)) {
      return { message: `${message} Нужно писать маленькими буквами: ${normalized}`, fix: didYouMean(normalized).fix }
    }
    // primary называет способ связи — понимаем «tg», «ватсап» и т.п.
    const suggestion = suggest(normalized, options, key === 'primary' ? CONTACT_ALIASES : {})
    if (suggestion) {
      const { hint, fix } = didYouMean(suggestion)
      return { message: `${message} ${hint}`, fix }
    }
    return { message: `${message} Можно: ${options.join(', ')}` }
  }
  if (typeof value === 'object') {
    return { message: `Поле «${key}» должно быть одной строкой текста` }
  }
  if (inner instanceof z.ZodURL) {
    const text = String(value)
    return {
      message: `Ссылка в поле «${key}» должна начинаться с https://`,
      fix: BARE_DOMAIN.test(text) ? { label: `Заменить на https://${text}`, replace: `https://${text}` } : undefined,
    }
  }
  if (inner instanceof z.ZodEmail) {
    return { message: `Адрес почты в поле «${key}» записан с ошибкой — нужен вид name@example.ru` }
  }
  return { message: `Значение поля «${key}» не подходит: ${(inner.description ?? '').toLowerCase()}` }
}

function check(key: string, value: unknown, schema: z.ZodType | undefined, range: Range | null): Diagnostic[] {
  if (!schema || !range || value === undefined || value === '') return []
  if (unwrap(schema).safeParse(value).success) return []
  return [{ ...range, severity: 'warning', code: 'invalid-value', ...explain(key, value, schema) }]
}

function checkMap(frontmatter: FrontmatterNode, node: unknown, schema: z.ZodObject): Diagnostic[] {
  const shape = schema.shape as Record<string, z.ZodType>
  return yamlPairs(frontmatter, node).flatMap((pair) =>
    check(pair.key, yamlValue(pair.value), shape[pair.key], pair.valueRange),
  )
}

function checkFrontmatter(frontmatter: FrontmatterNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const shape = frontmatterSchema.shape as Record<string, z.ZodType>

  for (const pair of yamlPairs(frontmatter, frontmatter.yaml.contents)) {
    if (pair.key === 'accent' || !pair.valueRange) continue

    if (pair.key === 'contacts') {
      if (isMap(pair.value)) diagnostics.push(...checkMap(frontmatter, pair.value, contactsSchema))
      else diagnostics.push({ ...pair.valueRange, severity: 'warning', code: 'invalid-value', message: 'Контакты пишутся списком с новой строки, например:\ncontacts:\n  telegram: barber_ivan' })
    } else if (pair.key === 'links') {
      if (isSeq(pair.value)) {
        for (const link of yamlItems(pair.value)) diagnostics.push(...checkMap(frontmatter, link, linkSchema))
      } else {
        diagnostics.push({ ...pair.valueRange, severity: 'warning', code: 'invalid-value', message: 'Ссылки пишутся списком: каждая с новой строки, начиная с «- label: …»' })
      }
    } else {
      diagnostics.push(...check(pair.key, yamlValue(pair.value), shape[pair.key], pair.valueRange))
    }
  }

  return diagnostics
}

export const invalidValueRule: Rule = ({ ast }) => {
  const diagnostics: Diagnostic[] = []
  if (ast.frontmatter && !ast.frontmatter.errors.length) diagnostics.push(...checkFrontmatter(ast.frontmatter))

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      const item = BLOCKS[block.name as BlockName]?.item
      if (!item) continue
      const shape = item.shape as Record<string, z.ZodType>
      for (const element of block.items) {
        for (const field of element.fields) diagnostics.push(...check(field.key, field.value, shape[field.key], field.valueRange))
      }
    }
  }

  return diagnostics
}
