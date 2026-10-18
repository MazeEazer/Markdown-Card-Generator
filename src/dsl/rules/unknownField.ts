// Поля, которых нет в схеме: в шапке, в contacts, в links и в элементах блоков. Плюс повтор поля в элементе.
import { z } from 'zod'
import type { BlockFieldNode, FrontmatterNode } from '../ast.ts'
import { BLOCKS, type BlockName } from '../schema/blocks.ts'
import { contactsSchema, frontmatterSchema } from '../schema/frontmatter.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { lineAt, shapeKeys, unwrap, yamlItems, yamlPairs } from './helpers.ts'

const linkSchema = (unwrap(frontmatterSchema.shape.links) as z.ZodArray<z.ZodObject>).element

function unknownInMap(frontmatter: FrontmatterNode, node: unknown, schema: z.ZodObject, where: string): Diagnostic[] {
  const known = new Set(shapeKeys(schema))
  return yamlPairs(frontmatter, node)
    .filter((pair) => !known.has(pair.key))
    .map((pair) => ({
      ...pair.keyRange,
      severity: 'warning' as const,
      code: 'unknown-field',
      message: `Неизвестное поле «${pair.key}» ${where} — оно не попадёт на сайт. Возможные поля: ${[...known].join(', ')}`,
    }))
}

/** Поле элемента блока, которого нет в схеме. Частый случай — продолжение текста, начавшееся со «слова:». */
function unknownBlockField(field: BlockFieldNode, previous: BlockFieldNode | undefined, text: string, block: string, known: string[]): Diagnostic {
  const base = { ...field.keyRange, severity: 'warning' as const, code: 'unknown-field' }
  const lineText = text.slice(field.from, lineAt(text, field.from).to)

  if (previous) {
    const startsWithLink = /^https?:\/\//i.test(lineText)
    return {
      ...base,
      message: startsWithLink
        ? 'Ссылка в начале строки читается как поле и пропадёт с сайта. Перенесите её в конец предыдущей строки'
        : `Строка «${lineText}» читается как неизвестное поле «${field.key}» — этот текст пропадёт с сайта. Если это продолжение предыдущего текста, присоедините строку к нему. Возможные поля: ${known.join(', ')}`,
      fix: { label: 'Присоединить к предыдущей строке', replace: ' ', from: previous.to, to: field.from },
    }
  }

  return {
    ...base,
    message: `Неизвестное поле «${field.key}» в блоке :::${block} — оно не попадёт на сайт. Возможные поля: ${known.join(', ')}`,
  }
}

export const unknownFieldRule: Rule = ({ text, ast }) => {
  const diagnostics: Diagnostic[] = []
  const frontmatter = ast.frontmatter

  if (frontmatter && !frontmatter.errors.length) {
    const root = frontmatter.yaml.contents
    diagnostics.push(...unknownInMap(frontmatter, root, frontmatterSchema, 'в шапке'))
    diagnostics.push(...unknownInMap(frontmatter, frontmatter.yaml.get('contacts', true), contactsSchema, 'в contacts'))
    for (const link of yamlItems(frontmatter.yaml.get('links', true))) {
      diagnostics.push(...unknownInMap(frontmatter, link, linkSchema, 'в ссылке'))
    }
  }

  for (const section of ast.sections) {
    for (const block of section.blocks) {
      const item = BLOCKS[block.name as BlockName]?.item
      if (!item) continue
      const known = shapeKeys(item)

      for (const element of block.items) {
        const seen = new Set<string>()
        element.fields.forEach((field, index) => {
          if (!known.includes(field.key)) {
            diagnostics.push(unknownBlockField(field, element.fields[index - 1], text, block.name, known))
          } else if (seen.has(field.key)) {
            diagnostics.push({
              ...field.keyRange,
              severity: 'warning',
              code: 'duplicate-field',
              message: `Поле «${field.key}» уже есть в этом элементе — первое значение пропадёт. Если это следующий элемент, отделите его пустой строкой`,
              fix: { label: 'Начать новый элемент', replace: '\n', from: field.from, to: field.from },
            })
          }
          seen.add(field.key)
        })
      }
    }
  }

  return diagnostics
}
