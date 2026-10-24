// В поле «Название сайта» (форма шаблона) иногда пишут целое описание бизнеса: с ценами, телефоном, адресом.
// Шаблон такое не разберёт, а генерация с ИИ — да. Здесь — грубая проверка «это описание, а не название»:
// по ней форма предлагает перейти в генерацию с этим текстом. Ложное срабатывание безвредно — это лишь подсказка.

const PHONE = /(?:\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b|\+\d{3}[\s(-]*\d{2}/
// \b в JS — только для латиницы, поэтому конец русского слова — «дальше не русская буква»
const PRICE = /\d\s*(?:₽|руб|тыс|[рк](?![а-яё]))/i
const HANDLE = /(?:^|\s)@[a-z0-9_]{3,}/i
const SENTENCE_BREAK = /[.!?]\s+[A-ZА-ЯЁ]/

export const NAME_MAX_LENGTH = 60

export function looksLikeDescription(text: string): boolean {
  const value = text.trim()
  if (!value) return false
  if (value.length > NAME_MAX_LENGTH) return true
  if (PHONE.test(value) || PRICE.test(value) || HANDLE.test(value)) return true
  if (SENTENCE_BREAK.test(value)) return true
  // Перечисление через запятые и много слов — уже рассказ о бизнесе, а не название
  return (value.match(/,/g) ?? []).length >= 3 || value.split(/\s+/).length > 8
}
