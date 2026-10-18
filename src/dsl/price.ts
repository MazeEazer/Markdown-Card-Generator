// Цены услуг: «1500», «от 1500», «1500–2000». Валюта — в шапке (currency), в цене её не пишут.

export interface Price {
  /** Нижняя граница или точная цена */
  from: number
  /** Верхняя граница диапазона «1500–2000» */
  to?: number
  /** «от 1500» */
  atLeast: boolean
}

/** Цены словами, которые тоже допустимы. */
const WORDS = /^(бесплатно|по договор[её]нности|договорная)$/i

const CANONICAL = /^(от\s+)?(\d+)(?:\s*[–-]\s*(\d+))?$/i

/** Цена в правильной записи → число(а); слово («бесплатно») или неправильная запись → null. */
export function parsePrice(value: string): Price | null {
  const match = value.trim().match(CANONICAL)
  if (!match) return null
  const from = Number(match[2])
  const to = match[3] ? Number(match[3]) : undefined
  return { from, to, atLeast: Boolean(match[1]) }
}

/** Цена записана правильно: числом, «от N», «N–M» или словом. */
export function isValidPrice(value: string): boolean {
  return parsePrice(value) !== null || WORDS.test(value.trim())
}

/**
 * Правильная запись цены, если её можно получить однозначно: «1500р» → «1500», «1 500 ₽» → «1500»,
 * «от 1500 руб.» → «от 1500». null — так не получается (нужен человек).
 */
export function normalizePrice(value: string): string | null {
  const text = value
    .trim()
    .replace(/\s*(₽|руб(?:лей|ля|ль)?\.?|р\.?|rub)\s*$/i, '') // валюта в конце
    .replace(/^(₽|руб\.?)\s*/i, '') // и в начале
    .replace(/(\d)[\s ](?=\d{3}(?!\d))/g, '$1') // «1 500» → «1500»
    .replace(/^от(\d)/i, 'от $1')
    .trim()
  return parsePrice(text) ? text : null
}

const CURRENCY_SIGNS: Record<string, string> = { RUB: '₽' }

/** «1500» → «1 500 ₽», «от 1500» → «от 1 500 ₽», «1500–2000» → «1 500–2 000 ₽»; слова — как есть. */
export function formatPrice(value: string, currency = 'RUB'): string {
  const price = parsePrice(value)
  if (!price) return value.trim()
  const sign = CURRENCY_SIGNS[currency] ?? currency
  // Неразрывные пробелы: цена не разрывается на две строки
  const number = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, ' ')
  const amount = price.to !== undefined ? `${number(price.from)}–${number(price.to)}` : number(price.from)
  return `${price.atLeast ? 'от ' : ''}${amount} ${sign}`
}
