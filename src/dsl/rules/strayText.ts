// Строки внутри элемента блока до первого поля: в CardData они не попадают.
import { BLOCKS, type BlockName } from '../schema/blocks.ts'
import type { Rule } from '../validate.ts'

export const strayTextRule: Rule = ({ ast }) =>
  ast.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      const item = BLOCKS[block.name as BlockName]?.item
      if (!item) return []
      const firstField = Object.keys(item.shape)[0]
      return block.items.flatMap((element) =>
        element.stray.map((range) => ({
          ...range,
          severity: 'warning' as const,
          code: 'stray-text',
          message: `Текст без названия поля не попадёт на сайт. Начните строку с поля, например «${firstField}: …»`,
        })),
      )
    }),
  )
