// Российские телефоны: распознавание записи «как придётся» и единый вид +7 999 123-45-67.
// Пригодится и генератору ссылок (tel:, wa.me) в этапе 3.

export interface Phone {
  /** Для ссылок: +79991234567 */
  e164: string
  /** Для людей: +7 999 123-45-67 */
  display: string
}

export const PHONE_DISPLAY = /^\+7 \d{3} \d{3}-\d{2}-\d{2}$/

/**
 * Разбирает российский номер в любой привычной записи: «8-999-123-45-67», «+7 (999) 1234567»,
 * «79991234567», «9991234567», ссылку wa.me/79991234567. Не российский или не номер — null.
 */
export function parseRussianPhone(value: string): Phone | null {
  const text = value.trim().replace(/^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?/i, '')
  // Буквы — это уже не номер (кроме добавочного «доб.» — его не поддерживаем)
  if (/[a-zа-яё]/i.test(text)) return null
  // Только цифры, пробелы, скобки, дефисы, точки и «+» в начале
  if (!/^\+?[\d\s().-]+$/.test(text)) return null

  let digits = text.replace(/\D/g, '')
  if (text.startsWith('+') && !digits.startsWith('7')) return null
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1)
  if (digits.length !== 10) return null

  return {
    e164: `+7${digits}`,
    display: `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`,
  }
}
