import { describe, expect, it } from 'vitest'
import { parseCardMarkdown } from '../lib/parser.ts'
import { templateMarkdown, TEMPLATES } from '../data/templates/index.ts'
import { applyTextChange, frontmatterFieldChange } from './frontmatterEdit.ts'
import { validate } from './validate.ts'

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ'
const setAvatar = (text: string) => applyTextChange(text, frontmatterFieldChange(text, 'avatar', PHOTO))

describe('frontmatterFieldChange: avatar в шапку', () => {
  it.each(TEMPLATES.map((t) => t.id))('шаблон %s: фото попадает в шапку и на сайт, остальной текст не меняется', (id) => {
    const text = templateMarkdown(id, 'Тест')
    const result = setAvatar(text)
    expect(parseCardMarkdown(result).data!.avatar).toBe(PHOTO)
    // Только одна новая строка — в шапке
    expect(result.replace(`avatar: ${PHOTO}\n`, '')).toBe(text.replace(/^avatar: .*\n/m, ''))
    const header = result.slice(0, result.indexOf('\n---', 3))
    expect(header).toContain(`avatar: ${PHOTO}`)
  })

  it('без avatar — сразу после name', () => {
    const text = '---\nname: Барбершоп\nphone: +7 900 000-00-00\n---\n\n## О нас\nТекст.\n'
    expect(setAvatar(text)).toBe(`---\nname: Барбершоп\navatar: ${PHOTO}\nphone: +7 900 000-00-00\n---\n\n## О нас\nТекст.\n`)
  })

  it('avatar уже есть — заменяется, а не добавляется второй', () => {
    const text = '---\nname: Барбершоп\navatar: https://example.ru/old.png\nphone: +7 900 000-00-00\n---\n'
    const result = setAvatar(text)
    expect(result).toBe(`---\nname: Барбершоп\navatar: ${PHOTO}\nphone: +7 900 000-00-00\n---\n`)
    expect(result.match(/^avatar:/gm)).toHaveLength(1)
  })

  it('повторное перетаскивание заменяет прежнее фото', () => {
    const once = setAvatar('---\nname: A\n---\n')
    const twice = applyTextChange(once, frontmatterFieldChange(once, 'avatar', 'data:image/jpeg;base64,BBBB'))
    expect(twice).toBe('---\nname: A\navatar: data:image/jpeg;base64,BBBB\n---\n')
  })

  it('строка «avatar:» в тексте раздела не трогается — меняется только шапка', () => {
    const text = '---\nname: A\n---\n\n## О нас\navatar: это не поле\n'
    expect(setAvatar(text)).toBe(`---\nname: A\navatar: ${PHOTO}\n---\n\n## О нас\navatar: это не поле\n`)
  })

  it('без name — после «---»', () => {
    expect(setAvatar('---\ntitle: Стрижки\n---\n')).toBe(`---\navatar: ${PHOTO}\ntitle: Стрижки\n---\n`)
  })

  it('шапка не закрыта — после первой «---», ошибка шапки остаётся для валидатора', () => {
    const result = setAvatar('---\nname: A\n\n## О нас\n')
    expect(result).toBe(`---\navatar: ${PHOTO}\nname: A\n\n## О нас\n`)
    expect(validate(result).map((d) => d.code)).toContain('unclosed-frontmatter')
  })

  it('шапки нет — создаётся с одним avatar, валидатор просит название', () => {
    const result = setAvatar('## О нас\nТекст.\n')
    expect(result).toBe(`---\navatar: ${PHOTO}\n---\n\n## О нас\nТекст.\n`)
    expect(validate(result).map((d) => d.code)).toContain('missing-name')
  })

  it('переводы строк Windows не ломают вставку', () => {
    const text = '---\r\nname: A\r\n---\r\n'
    expect(parseCardMarkdown(setAvatar(text)).data!.avatar).toBe(PHOTO)
  })
})
