// Неизвестное имя блока `:::name`.
import { BLOCK_NAMES, BLOCKS } from '../schema/blocks.ts'
import type { Rule } from '../validate.ts'

const AVAILABLE = BLOCK_NAMES.map((name) => `:::${name} (${BLOCKS[name].label.toLowerCase()})`).join(', ')

export const unknownBlockRule: Rule = ({ ast }) =>
  ast.sections.flatMap((section) =>
    section.blocks
      .filter((block) => !(block.name in BLOCKS))
      .map((block) => ({
        ...block.nameRange,
        severity: 'error' as const,
        code: 'unknown-block',
        message: `Неизвестный блок :::${block.name} — он покажется как обычный текст. Доступные блоки: ${AVAILABLE}`,
      })),
  )
