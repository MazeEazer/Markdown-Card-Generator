// Имена пользователей в мессенджерах и соцсетях: владелец часто вставляет ссылку или @имя вместо имени.
// Генератор ссылок этапа 3 строит https://t.me/<имя> и т.п. сам.
import type { ContactName } from './schema/frontmatter.ts'

/** Ссылки на профиль, из которых можно достать имя пользователя. */
const PROFILE_LINKS: Partial<Record<ContactName, RegExp>> = {
  telegram: /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/@?([\w]+)\/?$/i,
  vk: /^(?:https?:\/\/)?(?:www\.|m\.)?vk\.(?:com|ru)\/([\w.]+)\/?$/i,
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([\w.]+)\/?(?:\?.*)?$/i,
}

/** Контакты, где нужно имя пользователя (а не номер, почта или сайт). */
export const USERNAME_CONTACTS: ContactName[] = ['telegram', 'vk', 'max', 'instagram']

/** Имя пользователя из ссылки на профиль или из «@имя». null — значение уже не ссылка и не @имя. */
export function usernameFromLink(contact: ContactName, value: string): string | null {
  const text = value.trim()
  const link = PROFILE_LINKS[contact]?.exec(text)
  if (link) return link[1]
  if (/^@[\w.]+$/.test(text)) return text.slice(1)
  return null
}

/**
 * Проблема с именем пользователя Telegram или null, если имя подходит.
 * Правила Telegram: 5–32 символа, латинские буквы, цифры и «_», начинается с буквы, не заканчивается «_».
 */
export function telegramUsernameProblem(username: string): string | null {
  if (/[/.]/.test(username)) return 'нужно имя пользователя, а не ссылка'
  if (/[а-яё]/i.test(username)) return 'в имени пользователя Telegram только латинские буквы, цифры и «_»'
  if (/^\+?[\d\s()-]+$/.test(username)) return 'нужно имя пользователя, а не номер телефона (в Telegram: Настройки → Имя пользователя)'
  if (!/^[a-z0-9_]+$/i.test(username)) return 'в имени пользователя Telegram только латинские буквы, цифры и «_»'
  if (username.length < 5 || username.length > 32) return 'имя пользователя Telegram — от 5 до 32 символов'
  if (!/^[a-z]/i.test(username)) return 'имя пользователя Telegram начинается с буквы'
  if (username.endsWith('_')) return 'имя пользователя Telegram не может заканчиваться на «_»'
  return null
}
