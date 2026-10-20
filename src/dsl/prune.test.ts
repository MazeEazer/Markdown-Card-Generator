import { describe, expect, it } from 'vitest'
import { templateMarkdown, TEMPLATES } from '../data/templates/index.ts'
import { EMPTY_BLOCK, PRUNE_CODES, pruneEmptyBlocks } from './prune.ts'
import { validate } from './validate.ts'

const HEAD = '---\nname: Репетитор Анна\nphone: +7 999 123-45-67\n---\n\n'

describe('pruneEmptyBlocks', () => {
  it.each(TEMPLATES.map((t) => t.id))('шаблон %s не меняется', (id) => {
    const text = templateMarkdown(id, 'Тест')
    expect(pruneEmptyBlocks(text)).toEqual({ text, removed: [] })
  })

  it('онлайн-репетитор: «Как добраться» без адреса удаляется вместе с заголовком', () => {
    const text = `${HEAD}## Обо мне\nУчу математике онлайн.\n\n## Как добраться\n:::map\n:::\n\n## Цены\n:::services\ntitle: Урок\nprice: 1500\n:::\n`
    expect(pruneEmptyBlocks(text)).toEqual({
      text: `${HEAD}## Обо мне\nУчу математике онлайн.\n\n## Цены\n:::services\ntitle: Урок\nprice: 1500\n:::\n`,
      removed: ['map-no-address'],
    })
  })

  it('последний раздел удаляется без лишних пустых строк в конце', () => {
    const text = `${HEAD}## Обо мне\nУчу онлайн.\n\n## Как добраться\n:::map\n:::\n\n\n`
    expect(pruneEmptyBlocks(text).text).toBe(`${HEAD}## Обо мне\nУчу онлайн.\n`)
  })

  it('в разделе есть свой текст — удаляется только блок', () => {
    const text = `${HEAD}## Где занимаемся\nЗанятия по Zoom.\n:::map\n:::\n`
    expect(pruneEmptyBlocks(text)).toEqual({ text: `${HEAD}## Где занимаемся\nЗанятия по Zoom.\n`, removed: ['map-no-address'] })
  })

  it('карта с адресом в шапке или в самом блоке остаётся', () => {
    const withAddress = '---\nname: A\nphone: +7 999 123-45-67\ncity: Самара\naddress: ул. Ленина, 10\n---\n\n## Как добраться\n:::map\n:::\n'
    expect(pruneEmptyBlocks(withAddress).removed).toEqual([])
    const own = `${HEAD}## Как добраться\n:::map\naddress: Самара, ул. Ленина, 10\n:::\n`
    expect(pruneEmptyBlocks(own).removed).toEqual([])
  })

  it('«Контакты» без единого контакта удаляются, с телефоном — остаются', () => {
    const empty = '---\nname: A\n---\n\n## О нас\nТекст.\n\n## Контакты\n:::contacts\n:::\n'
    expect(pruneEmptyBlocks(empty)).toEqual({ text: '---\nname: A\n---\n\n## О нас\nТекст.\n', removed: ['contacts-block-empty'] })
    expect(pruneEmptyBlocks(`${HEAD}## Контакты\n:::contacts\n:::\n`).removed).toEqual([])
  })

  it('пустые часы работы и блоки без элементов удаляются', () => {
    const text = `${HEAD}## Часы\n:::hours\n:::\n\n## Вопросы\n:::accordion\n:::\n\n## Отзывы\n:::reviews\n\n:::\n\n## Услуги\n:::services\ntitle: Урок\n:::\n`
    const result = pruneEmptyBlocks(text)
    expect(result.removed).toEqual(['hours-empty', EMPTY_BLOCK, EMPTY_BLOCK])
    expect(result.text).toBe(`${HEAD}## Услуги\n:::services\ntitle: Урок\n:::\n`)
  })

  it('после удаления валидатор не находит пустых блоков, а повторный запуск ничего не меняет', () => {
    const text = `${HEAD}## Как добраться\n:::map\n:::\n\n## Часы\n:::hours\n:::\n\n## Контакты\n:::contacts\n:::\n`
    const { text: pruned } = pruneEmptyBlocks(text)
    expect(validate(pruned).filter((d) => PRUNE_CODES.has(d.code))).toEqual([])
    expect(pruneEmptyBlocks(pruned)).toEqual({ text: pruned, removed: [] })
  })
})
