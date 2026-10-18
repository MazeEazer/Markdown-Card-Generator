/** Диапазон в тексте документа: смещения в символах, `to` не включается. */
export interface Range {
  from: number
  to: number
}

export type Severity = 'error' | 'warning' | 'info'

/** Автоисправление: заменить текст диапазона диагностики на `replace`. */
export interface DiagnosticFix {
  /** Подпись кнопки, например «Заменить на +7 999 123-45-67» */
  label: string
  replace: string
}

/** Сообщение валидатора с позицией в тексте. */
export interface Diagnostic extends Range {
  severity: Severity
  /** Машинный код правила: 'unknown-field', 'price-not-number', ... */
  code: string
  /** Сообщение по-русски, понятное владельцу бизнеса */
  message: string
  fix?: DiagnosticFix
}

/** Позиция для человека: строки и колонки считаются с 1, как в редакторе. */
export interface LineCol {
  line: number
  column: number
}
