// Точечная правка поля шапки: заменить строку поля или добавить её после name. Возвращает одну правку текста —
// редактор применяет её одной транзакцией (одна отмена Cmd+Z), остальной текст и курсор не трогаются.
// Нужна для перетаскивания фото: раньше avatar дописывался в конец документа — за пределы шапки, если в ней
// не было avatar или location (шаблоны по нишам с этапа 3), и фото на сайте не появлялось.
import { parseDocument } from './parser.ts'

export interface TextChange {
  from: number
  to: number
  insert: string
}

/** Конец строки, в которой стоит offset (без перевода строки). */
function lineEnd(text: string, offset: number): number {
  const newline = text.indexOf('\n', offset)
  return newline === -1 ? text.length : newline
}

/**
 * Записать «key: value» в шапку. Поле есть — заменяется его строка; нет — добавляется после name (или сразу
 * после «---», если name нет). Шапка не закрыта или с ошибкой YAML — строка добавляется после первой «---».
 * Шапки нет — создаётся шапка с одним этим полем: дальше валидатор подскажет добавить название (missing-name).
 */
export function frontmatterFieldChange(text: string, key: string, value: string): TextChange {
  const line = `${key}: ${value}`
  const frontmatter = parseDocument(text).frontmatter

  if (!frontmatter) {
    if (/^---\r?\n/.test(text)) {
      const at = text.indexOf('\n') + 1
      return { from: at, to: at, insert: `${line}\n` }
    }
    return { from: 0, to: 0, insert: `---\n${line}\n---\n\n` }
  }

  const field = frontmatter.fields.find((f) => f.key === key)
  if (field) {
    const from = text.lastIndexOf('\n', field.keyRange.from - 1) + 1
    // Значение могло занимать несколько строк (YAML), но для avatar это одна строка; заменяем строку поля
    return { from, to: lineEnd(text, field.valueRange?.to ?? field.keyRange.to), insert: line }
  }

  const name = frontmatter.fields.find((f) => f.key === 'name')
  const at = name ? lineEnd(text, name.valueRange?.to ?? name.keyRange.to) + 1 : frontmatter.yamlFrom
  return { from: at, to: at, insert: `${line}\n` }
}

export function applyTextChange(text: string, change: TextChange): string {
  return text.slice(0, change.from) + change.insert + text.slice(change.to)
}
