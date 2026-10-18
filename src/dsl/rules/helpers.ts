// Общие помощники правил: строки текста, поля YAML с позициями, схема Zod.
import { isMap, isScalar, isSeq, type Node } from 'yaml'
import { z } from 'zod'
import type { FrontmatterNode } from '../ast.ts'
import type { Range } from '../types.ts'

/** Диапазон строки, в которой находится смещение (без перевода строки и `\r`). */
export function lineAt(text: string, offset: number): Range {
  // lastIndexOf с отрицательным индексом ищет с позиции 0 — для начала текста строку начинаем явно
  const from = offset > 0 ? text.lastIndexOf('\n', offset - 1) + 1 : 0
  let to = text.indexOf('\n', offset)
  if (to === -1) to = text.length
  if (text[to - 1] === '\r') to--
  return { from, to }
}

/** Пара `ключ: значение` в YAML-отображении с позициями в исходном тексте. */
export interface YamlPair {
  key: string
  keyRange: Range
  /** null — у ключа нет значения */
  valueRange: Range | null
  value: Node | null
}

function nodeRange(frontmatter: FrontmatterNode, node: Node | null | undefined): Range | null {
  if (!node?.range) return null
  const [from, to] = node.range
  if (from === to) return null
  return { from: frontmatter.yamlFrom + from, to: frontmatter.yamlFrom + to }
}

/** Пары отображения YAML (корень шапки, contacts, элемент links). Не-отображение — пустой список. */
export function yamlPairs(frontmatter: FrontmatterNode, node: unknown): YamlPair[] {
  if (!isMap(node)) return []
  return node.items.flatMap((pair) => {
    if (!isScalar(pair.key)) return []
    const value = (pair.value ?? null) as Node | null
    return [
      {
        key: String(pair.key.value),
        keyRange: nodeRange(frontmatter, pair.key)!,
        valueRange: nodeRange(frontmatter, value),
        value,
      },
    ]
  })
}

/** Элементы списка YAML (links). */
export function yamlItems(node: unknown): unknown[] {
  return isSeq(node) ? node.items : []
}

/**
 * Значение YAML для проверки схемой. Скаляры — как написал человек:
 * `phone: 89991234567` YAML прочитал бы как число, а схема ждёт строку.
 */
export function yamlValue(node: Node | null): unknown {
  if (!node) return undefined
  if (isScalar(node)) {
    if (node.value === null) return undefined
    if (node.type === 'PLAIN' && node.source !== undefined && typeof node.value !== 'string') return node.source
    return node.value
  }
  return node.toJSON()
}

/** Поле со строковым значением и его позицией — для правил о контактах. */
export interface TextField {
  key: string
  value: string
  valueRange: Range
}

/** Непустые строковые поля отображения YAML (корень шапки или contacts). */
export function textFields(frontmatter: FrontmatterNode, node: unknown): TextField[] {
  return yamlPairs(frontmatter, node).flatMap((pair) => {
    const value = yamlValue(pair.value)
    if (!pair.valueRange || value === undefined || typeof value === 'object') return []
    const text = String(value).trim()
    return text ? [{ key: pair.key, value: text, valueRange: pair.valueRange }] : []
  })
}

/** Поля шапки и contacts по ключу; пусто, если шапки нет или в ней ошибка YAML. */
export function businessFields(frontmatter: FrontmatterNode | null): {
  root: Map<string, TextField>
  contacts: Map<string, TextField>
} {
  if (!frontmatter || frontmatter.errors.length) return { root: new Map(), contacts: new Map() }
  const byKey = (fields: TextField[]) => new Map(fields.map((field) => [field.key, field]))
  return {
    root: byKey(textFields(frontmatter, frontmatter.yaml.contents)),
    contacts: byKey(textFields(frontmatter, frontmatter.yaml.get('contacts', true))),
  }
}

/** Снимает обёртку .optional(). */
export function unwrap(schema: z.ZodType): z.ZodType {
  return schema instanceof z.ZodOptional ? (schema.unwrap() as z.ZodType) : schema
}

/** Допустимые значения, если поле — перечисление. */
export function enumOptions(schema: z.ZodType): string[] | null {
  const inner = unwrap(schema)
  return inner instanceof z.ZodEnum ? (inner.options as string[]) : null
}

/** Хвост сообщения и исправление для подсказки «возможно, вы имели в виду». */
export function didYouMean(suggestion: string): { hint: string; fix: { label: string; replace: string } } {
  return {
    hint: `Возможно, вы имели в виду «${suggestion}»?`,
    fix: { label: `Заменить на ${suggestion}`, replace: suggestion },
  }
}

/** Ключи объекта схемы. */
export function shapeKeys(schema: z.ZodObject): string[] {
  return Object.keys(schema.shape)
}
