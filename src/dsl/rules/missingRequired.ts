// Обязательные поля: шапка с name и обязательные поля элементов блоков.
import { z } from 'zod'
import { BLOCKS, type BlockName } from '../schema/blocks.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { indentBeforeFrontmatter, lineAt } from './helpers.ts'

const NAME_PLACEHOLDER = 'Моё название'

export const missingRequiredRule: Rule = ({ text, ast }) => {
  const diagnostics: Diagnostic[] = []
  const frontmatter = ast.frontmatter

  // Шапка не с первой строки — это ошибка frontmatter-not-first, а не «нет шапки»
  if (!frontmatter && !/^---\r?\n/.test(text) && !indentBeforeFrontmatter(text)) {
    diagnostics.push({
      ...lineAt(text, 0),
      severity: 'error',
      code: 'missing-frontmatter',
      message: 'Нет шапки с названием — сайт не покажется. Добавьте в начало шапку с полем name',
      fix: { label: 'Добавить шапку', replace: `---\nname: ${NAME_PLACEHOLDER}\n---\n\n`, from: 0, to: 0 },
    })
  } else if (frontmatter && !frontmatter.errors.length) {
    const nameField = frontmatter.fields.find((field) => field.key === 'name')
    if (!nameField) {
      diagnostics.push({
        from: 0,
        to: 3,
        severity: 'error',
        code: 'missing-name',
        message: 'В шапке нет названия (name) — сайт не покажется',
        fix: {
          label: 'Добавить поле name',
          replace: `name: ${NAME_PLACEHOLDER}\n`,
          from: frontmatter.yamlFrom,
          to: frontmatter.yamlFrom,
        },
      })
    } else if (!String(nameField.value ?? '').trim()) {
      diagnostics.push({
        ...nameField.keyRange,
        severity: 'error',
        code: 'missing-name',
        message: 'Название (name) пустое — сайт не покажется',
      })
    }
  }

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      const item = BLOCKS[block.name as BlockName]?.item
      if (!item) continue

      const required = Object.entries(item.shape as Record<string, z.ZodType>).filter(([, schema]) => !(schema instanceof z.ZodOptional))
      for (const element of block.items) {
        if (!element.fields.length) continue // строки без полей — правило stray-text
        const keys = new Set(element.fields.map((field) => field.key))
        for (const [key, schema] of required) {
          if (keys.has(key)) continue
          diagnostics.push({
            ...lineAt(text, element.from),
            severity: 'warning',
            code: 'missing-item-field',
            message: `В элементе блока :::${block.name} нет поля «${key}» (${(schema.description ?? '').toLowerCase()})`,
          })
        }
      }
    }
  }

  return diagnostics
}
