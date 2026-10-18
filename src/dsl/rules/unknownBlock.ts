// Неизвестное имя блока `:::name` — с подсказкой, если похоже на опечатку.
import { BLOCK_ALIASES, BLOCK_NAMES, BLOCKS } from '../schema/blocks.ts'
import { suggest } from '../suggest.ts'
import type { Diagnostic } from '../types.ts'
import type { Rule } from '../validate.ts'
import { didYouMean } from './helpers.ts'

const AVAILABLE = BLOCK_NAMES.map((name) => `:::${name} (${BLOCKS[name].label.toLowerCase()})`).join(', ')

export const unknownBlockRule: Rule = ({ ast }) =>
  ast.sections.flatMap((section) =>
    section.blocks
      .filter((block) => !(block.name in BLOCKS))
      .map((block): Diagnostic => {
        const base = { ...block.nameRange, severity: 'error' as const, code: 'unknown-block' }
        const suggestion = suggest(block.name, BLOCK_NAMES, BLOCK_ALIASES)
        if (suggestion) {
          return {
            ...base,
            message: `Неизвестный блок :::${block.name}. Возможно, вы имели в виду «:::${suggestion}»?`,
            fix: didYouMean(suggestion).fix,
          }
        }
        return { ...base, message: `Неизвестный блок :::${block.name} — он покажется как обычный текст. Доступные блоки: ${AVAILABLE}` }
      }),
  )
