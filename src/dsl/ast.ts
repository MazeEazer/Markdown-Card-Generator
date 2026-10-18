import type { Document } from 'yaml'
import type { Range } from './types.ts'

// Дерево разбора документа. Все диапазоны — смещения в исходном тексте целиком,
// не в отдельной секции или шапке: валидатор и редактор работают с ними напрямую.

/** Ошибка синтаксиса YAML в шапке. */
export interface YamlErrorNode extends Range {
  code: string
  message: string
}

/** Поле верхнего уровня шапки: `key: value`. */
export interface FrontmatterField {
  key: string
  keyRange: Range
  /** null — поле без значения (`accent:` или `accent: #abc`, где `#abc` — YAML-комментарий) */
  valueRange: Range | null
  value: unknown
}

/** Шапка между строками `---`. */
export interface FrontmatterNode extends Range {
  /** Смещение начала YAML-текста: диапазоны внутри `yaml` считаются от него */
  yamlFrom: number
  yamlText: string
  /** Документ библиотеки yaml — для правил, которым нужны вложенные поля (contacts) */
  yaml: Document
  /** Значение шапки как объект; при ошибках YAML или не-объекте — {} */
  data: Record<string, unknown>
  fields: FrontmatterField[]
  errors: YamlErrorNode[]
}

/** Поле элемента блока: `key: value` плюс строки-продолжения без ключа. */
export interface BlockFieldNode extends Range {
  /** Имя поля в нижнем регистре */
  key: string
  keyRange: Range
  /** Строки значения склеены пробелом, как в CardData */
  value: string
  /** От начала значения в строке с ключом до конца последней строки-продолжения */
  valueRange: Range
}

/** Элемент блока — группа строк между пустыми строками. */
export interface BlockItemNode extends Range {
  fields: BlockFieldNode[]
  /** Строки без ключа до первого поля — они не попадают в CardData */
  stray: Range[]
}

/** Блок `:::name attrs … :::`. */
export interface BlockNode extends Range {
  /** Имя блока в нижнем регистре */
  name: string
  nameRange: Range
  attrs: string
  attrsRange: Range
  /** Строка открытия `:::name …` */
  openRange: Range
  /** Строка закрытия `:::`; null — блок не закрыт и тянется до конца документа */
  closeRange: Range | null
  /** Строки между открытием и закрытием */
  bodyRange: Range
  items: BlockItemNode[]
}

/** Секция `## Заголовок` (или текст до первого заголовка). */
export interface SectionNode extends Range {
  title: string
  /** Строка `## …`; null — безымянная секция в начале документа */
  headingRange: Range | null
  titleRange: Range | null
  /** Содержимое ровно так, как его видит CardData: обрезано, `##` без названия заменено на `***` */
  content: string
  blocks: BlockNode[]
}

export interface DocumentNode extends Range {
  text: string
  frontmatter: FrontmatterNode | null
  /** Начало тела документа — сразу после шапки */
  bodyFrom: number
  /** Все секции, включая пустые (в CardData пустые не попадают) */
  sections: SectionNode[]
}
