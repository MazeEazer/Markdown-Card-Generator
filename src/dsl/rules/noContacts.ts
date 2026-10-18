// Нет ни одного способа связи — главная задача сайта (клиент звонит или пишет) не выполняется.
import { toCardData } from '../cardData.ts'
import type { Rule } from '../validate.ts'

/** Ссылки в links, по которым тоже можно связаться. */
const CONTACT_LINK = /^(tel:|mailto:|https?:\/\/(www\.)?(t\.me|wa\.me|vk\.com|vk\.ru|instagram\.com)\/)/i

const MESSENGERS = ['telegram', 'whatsapp', 'vk', 'max', 'instagram', 'email'] as const

export const noContactsRule: Rule = ({ ast }) => {
  // Без шапки или name — уже ошибка другого правила
  const card = toCardData(ast).data
  if (!card) return []

  const reachable =
    Boolean(card.phone) ||
    MESSENGERS.some((key) => card.contacts?.[key]) ||
    card.links.some((link) => CONTACT_LINK.test(link.url))
  if (reachable) return []

  return [
    {
      from: 0,
      to: 3,
      severity: 'warning',
      code: 'no-contacts',
      message:
        'Нет ни телефона, ни мессенджера — клиенты не смогут с вами связаться. Добавьте в шапку phone или contacts, например:\nphone: +7 999 123-45-67\ncontacts:\n  telegram: ваше_имя',
    },
  ]
}
