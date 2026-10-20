// Проверка по описанию: каждый контакт и ссылка в ответе нейросети должны встречаться в описании пользователя.
// Только для AI-генерации (generate.ts). Запреты в промпте модель соблюдает не всегда: на шаге 8 она подставила
// телефон из примера промпта, придумала instagram по названию студии и аватар example.com. Валидатор этого
// не видит — поля заполнены правильно по форме, — поэтому проверяем содержание по описанию, без нейросети.
// Адрес и город сравниваются по основам слов и числам: нейросеть склоняет («на Садовой» → «ул. Садовая»)
// и сокращает («екб»), поэтому точное совпадение не подходит; ложное удаление хуже пропущенной выдумки.
import { isMap, isScalar, isSeq, type Node, type Pair, type YAMLMap } from 'yaml'
import { MAX_LINK, USERNAME_CONTACTS, usernameFromLink } from './contacts.ts'
import { parseDocument } from './parser.ts'
import { parseRussianPhone } from './phone.ts'
import type { ContactName } from './schema/frontmatter.ts'
import type { Range } from './types.ts'
import { letters, stemMatcher, wordsOf } from './words.ts'

/** Код в журнале (fixed_codes) для каждого удалённого поля. */
export const UNGROUNDED = 'ungrounded-contact'
/** Код для валюты, не названной в описании. */
export const UNGROUNDED_CURRENCY = 'ungrounded-currency'

/**
 * Как валюту называют в описании. «тг» сюда не входит: в описании «тг ivan_borodach» — это Telegram,
 * а GigaChat-3-Lightning прочитал его как тенге (currency: KZT, «1500 тг»).
 */
const CURRENCY_WORDS: Record<string, RegExp> = {
  KZT: /тенге|₸|\bkzt\b/i,
  USD: /доллар|\$|\busd\b/i,
  EUR: /евро|€|\beur\b/i,
  BYN: /белорусск\S* руб|бел\.\s*руб|\bbyn\b/i,
  UAH: /гривн|₴|\buah\b/i,
}

export interface GroundResult {
  text: string
  /** По коду на каждое удалённое поле */
  removed: string[]
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Адрес без протокола, www и косой черты в конце, в нижнем регистре. */
const bareUrl = (url: string) => url.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')

/** Слова перед номером: номер для звонков или только для мессенджера (правило 6 промпта). */
const CALL_WORDS = /звон|телефон|тел\.|phone|моб/i
const MESSENGER_WORDS = /whats\s?app|в[ао]тс?апп?|вацап|viber|вайбер|telegram|телеграмм?|(?<![\p{L}])(?:тг|tg|wa|max|макс)(?![\p{L}])/iu

/** Начало предложения до номера: по нему понятно, для чего номер дан. */
function sentenceBefore(description: string, at: number): string {
  const before = description.slice(Math.max(0, at - 40), at)
  return before.slice(Math.max(...['.', '!', '?', ';', '\n'].map((c) => before.lastIndexOf(c))) + 1)
}

/** Номер для звонков: перед ним в том же предложении есть слово про звонок или нет слова про мессенджер. */
function forCalls(description: string, at: number): boolean {
  const sentence = sentenceBefore(description, at)
  return CALL_WORDS.test(sentence) || !MESSENGER_WORDS.test(sentence)
}

/** Номер для мессенджера: есть слово про мессенджер или нет слова про звонок («по телефону 8 912…» — не WhatsApp). */
function forMessenger(description: string, at: number): boolean {
  const sentence = sentenceBefore(description, at)
  return MESSENGER_WORDS.test(sentence) || !CALL_WORDS.test(sentence)
}

/** Служебные слова адреса: в описании их могут не писать или писать иначе. */
const ADDRESS_STOP_WORDS = new Set([
  'ул', 'улица', 'пр', 'просп', 'проспект', 'пер', 'переулок', 'бул', 'бульвар', 'ш', 'шоссе', 'наб', 'набережная',
  'пл', 'площадь', 'д', 'дом', 'к', 'корп', 'корпус', 'стр', 'строение', 'кв', 'оф', 'офис', 'кабинет', 'каб',
  'этаж', 'эт', 'район', 'р-н', 'мкр', 'микрорайон', 'г', 'город', 'пос', 'поселок', 'вход', 'street', 'st', 'avenue', 'ave',
])

/** Сокращения и английские названия городов, которыми пишут в описании. */
const CITY_ALIASES: Record<string, string[]> = {
  'москва': ['мск', 'moscow'],
  'санкт-петербург': ['спб', 'питер', 'петербург', 'saint petersburg', 'st petersburg', 'st. petersburg'],
  'екатеринбург': ['екб', 'ебург', 'yekaterinburg', 'ekaterinburg'],
  'новосибирск': ['нск', 'novosibirsk'],
  'нижний новгород': ['нн', 'нижний', 'nizhny novgorod'],
  'казань': ['kazan'],
  'самара': ['samara'],
  'краснодар': ['krasnodar'],
  'ростов-на-дону': ['ростов', 'rostov'],
}

const numbersOf = (text: string) => text.match(/\d+/g) ?? []

/** Что есть в описании: телефоны, слова-имена и адреса. */
function groundTruth(description: string) {
  const lower = description.toLowerCase()
  const urls = bareUrl(lower.replace(/[a-z]+:\/\//g, '').replace(/(^|[\s(«"])www\./g, '$1'))
  // Номера в любой записи: «8-999-123-45-67», «+7 (999) 123 45 67», wa.me/7999…
  const matches = [...description.matchAll(/\+?\d[\d\s().-]{6,}\d/g)]
  const runs = matches.map((m) => m[0])
  const phones = new Set(runs.flatMap((run) => parseRussianPhone(run)?.e164 ?? []))
  // phone — кнопка «Позвонить»: только номер, данный для звонков (не «пишите в вотсап …»)
  const numberKey = (run: string) => parseRussianPhone(run)?.e164 ?? run.replace(/\D/g, '')
  const callNumbers = new Set(matches.filter((m) => forCalls(description, m.index)).map((m) => numberKey(m[0])))
  // whatsapp — номер, данный для мессенджера или без уточнения (Lightning записал в whatsapp номер «по телефону»)
  const messengerNumbers = new Set(matches.filter((m) => forMessenger(description, m.index)).map((m) => numberKey(m[0])))

  // Граница имени: «olga.nails» не найдено в «olga.nails.ekb» — точка перед буквой продолжает имя
  const descNumbers = new Set(numbersOf(description))
  const hasStem = stemMatcher(description)
  const hasWord = (word: string) => new RegExp(`(?<![\\w.])${escape(word.toLowerCase())}(?![\\w]|\\.\\w)`, 'u').test(lower)
  return {
    /** Номер есть в описании и дан для мессенджера или без уточнения (для whatsapp) */
    messengerPhone(value: string): boolean {
      return messengerNumbers.has(parseRussianPhone(value)?.e164 ?? value.replace(/\D/g, ''))
    },
    /** Номер есть в описании и дан для звонков (для phone) */
    callPhone(value: string): boolean {
      return callNumbers.has(parseRussianPhone(value)?.e164 ?? value.replace(/\D/g, ''))
    },
    username(contact: ContactName, value: string): boolean {
      const name = usernameFromLink(contact, value) ?? value.trim().replace(/^@/, '')
      return name.length > 0 && hasWord(name)
    },
    email: (value: string) => hasWord(value.trim()),
    /** Адрес: каждое значимое слово — по основе, каждое число (дом, этаж, кабинет) — как есть */
    address(value: string): boolean {
      const words = wordsOf(value).filter((w) => w.length >= 3 && !ADDRESS_STOP_WORDS.has(w))
      return words.every(hasStem) && numbersOf(value).every((n) => descNumbers.has(n))
    },
    /** Город: по основе слов или по сокращению / английскому названию */
    city(value: string): boolean {
      const city = letters(value).trim()
      if (CITY_ALIASES[city]?.some((alias) => new RegExp(`(?<![\\p{L}])${escape(alias)}(?![\\p{L}])`, 'u').test(letters(description)))) return true
      const words = wordsOf(value).flatMap((w) => w.split('-')).filter((w) => w.length >= 3 && w !== 'на')
      return words.length > 0 && words.every(hasStem)
    },
    /**
     * Ссылка с путём — нужен адрес целиком, без пути — достаточно домена. Ссылка на профиль (t.me, vk.com,
     * instagram.com, wa.me) — по имени пользователя или номеру: «инстаграм maria_foto_ekb» подтверждает
     * https://instagram.com/maria_foto_ekb.
     */
    url(value: string): boolean {
      const url = bareUrl(value)
      if (url.length > 0 && urls.includes(url)) return true
      for (const contact of USERNAME_CONTACTS) {
        const name = usernameFromLink(contact, value)
        if (name && /^(?:https?:\/\/)?(?:www\.|m\.)?[a-z.]+\//i.test(value.trim()) && hasWord(name)) return true
      }
      const wa = value.trim().match(/^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?\d+)/i)
      return Boolean(wa && phones.has(parseRussianPhone(wa[1])?.e164 ?? ''))
    },
  }
}

type Truth = ReturnType<typeof groundTruth>

/** Есть ли значение контакта в описании. */
function grounded(truth: Truth, contact: string, value: string): boolean {
  switch (contact) {
    case 'whatsapp':
      return truth.messengerPhone(value)
    case 'telegram':
    case 'vk':
    case 'instagram':
      return truth.username(contact, value)
    case 'max':
      return MAX_LINK.test(value.trim()) ? truth.url(value) : truth.username('max', value)
    case 'email':
      return truth.email(value)
    default:
      return truth.url(value)
  }
}

const scalarText = (node: unknown): string | null =>
  isScalar(node) && node.value !== null ? String((node as { source?: string }).source ?? node.value) : null

/** Начало строки и конец строки (с переводом) вокруг [from, to). */
function wholeLines(text: string, from: number, to: number): Range {
  const start = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', Math.max(from, to - 1))
  return { from: start, to: newline === -1 ? text.length : newline + 1 }
}

export function groundContacts(text: string, description: string): GroundResult {
  const ast = parseDocument(text)
  const frontmatter = ast.frontmatter
  if (!frontmatter || frontmatter.errors.length || !isMap(frontmatter.yaml.contents)) return { text, removed: [] }

  const truth = groundTruth(description)
  const cuts: Range[] = []
  const removed: string[] = []
  // Диапазон узла YAML — в абсолютных смещениях документа, целыми строками
  const lines = (node: Node | Pair) => {
    const range = isScalar(node) || isMap(node) || isSeq(node) ? node.range : null
    const [from, to] = range
      ? [range[0], range[1]]
      : [((node as Pair).key as Node).range![0], (((node as Pair).value ?? (node as Pair).key) as Node).range![1]]
    return wholeLines(text, frontmatter.yamlFrom + from, frontmatter.yamlFrom + to)
  }
  const cut = (node: Node | Pair) => {
    cuts.push(lines(node))
    removed.push(UNGROUNDED)
  }

  const root = frontmatter.yaml.contents as YAMLMap
  // Заранее: phone может стоять в шапке после contacts, а primary: phone зависит от него
  const phone = scalarText(root.get('phone', true))
  const phoneRemoved = phone !== null && !truth.callPhone(phone)
  for (const pair of root.items) {
    const key = scalarText(pair.key)
    if (key === 'phone') {
      if (phoneRemoved) cut(pair)
    } else if (key === 'currency') {
      // RUB — по умолчанию; другая валюта — только если она прямо названа в описании
      const value = (scalarText(pair.value) ?? '').trim().toUpperCase()
      const named = CURRENCY_WORDS[value] ?? new RegExp(`\\b${escape(value)}\\b`, 'i')
      if (value && value !== 'RUB' && !named.test(description)) {
        cuts.push(lines(pair))
        removed.push(UNGROUNDED_CURRENCY)
      }
    } else if (key === 'avatar' || key === 'address' || key === 'city') {
      const value = scalarText(pair.value)
      const ok = key === 'avatar' ? truth.url : key === 'address' ? truth.address : truth.city
      if (value && !ok(value)) cut(pair)
    } else if (key === 'links' && isSeq(pair.value)) {
      const items = pair.value.items.filter((item) => isMap(item))
      const bad = items.filter((item) => {
        const url = scalarText((item as YAMLMap).get('url', true))
        return url !== null && !truth.url(url)
      })
      if (bad.length && bad.length === items.length) cut(pair)
      else for (const item of bad) cut(item as YAMLMap)
    } else if (key === 'contacts' && isMap(pair.value)) {
      const entries = pair.value.items.map((item) => ({ item, name: scalarText(item.key) ?? '', value: scalarText(item.value) }))
      const contacts = entries.filter((e) => e.name !== 'primary' && e.value)
      const bad = contacts.filter((e) => !grounded(truth, e.name, e.value!))
      const kept = new Set(contacts.filter((e) => !bad.includes(e)).map((e) => e.name))
      const primary = entries.find((e) => e.name === 'primary')
      // primary без своего контакта убирается всегда: и если контакт удалили мы, и если модель его не написала
      const target = primary?.value ?? ''
      const phoneKept = phone !== null && !phoneRemoved
      const primaryGone = Boolean(primary) && !(kept.has(target) || (target === 'phone' && phoneKept))
      if (!kept.size && (bad.length || primaryGone)) {
        // Не осталось ни одного контакта — убираем contacts целиком (с primary)
        cuts.push(lines(pair))
        removed.push(...bad.map(() => UNGROUNDED))
      } else {
        for (const e of bad) cut(e.item)
        if (primaryGone) cuts.push(lines(primary!.item))
      }
    }
  }

  // Ссылки в карточках (url, link) — по той же проверке
  for (const section of ast.sections) {
    for (const block of section.blocks) {
      for (const item of block.items) {
        for (const field of item.fields) {
          if ((field.key === 'url' || field.key === 'link') && field.value && !truth.url(field.value)) {
            cuts.push(wholeLines(text, field.from, field.to))
            removed.push(UNGROUNDED)
          }
        }
      }
    }
  }

  let result = text
  for (const { from, to } of cuts.sort((a, b) => b.from - a.from)) result = result.slice(0, from) + result.slice(to)
  return { text: result, removed }
}
