// Города в описании: сокращения для проверки city (ground.ts) и поиск названного города, когда модель city не написала
// (city.ts). Список — крупные города без названий, совпадающих с именами и словами («Владимир», «Орёл», «Находка»).
import { letters, wordsOf } from './words.ts'

/** Сокращения и английские названия городов, которыми пишут в описании. */
export const CITY_ALIASES: Record<string, string[]> = {
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

/** Названия в именительном падеже: в city пишем так. «Нижний Новгород» и «Ростов-на-Дону» — через CITY_ALIASES. */
const CITIES = [
  'Москва', 'Новосибирск', 'Екатеринбург', 'Казань', 'Челябинск', 'Самара', 'Омск', 'Уфа', 'Красноярск', 'Воронеж',
  'Пермь', 'Волгоград', 'Краснодар', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск', 'Иркутск',
  'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань',
  'Астрахань', 'Пенза', 'Липецк', 'Чебоксары', 'Калининград', 'Тула', 'Курск', 'Севастополь', 'Сочи',
  'Ставрополь', 'Тверь', 'Магнитогорск', 'Иваново', 'Брянск', 'Белгород', 'Сургут', 'Архангельск', 'Калуга',
  'Смоленск', 'Череповец', 'Вологда', 'Саранск', 'Якутск', 'Мурманск', 'Тамбов', 'Кострома', 'Петрозаводск',
  'Новороссийск', 'Сыктывкар', 'Нальчик', 'Нижнекамск', 'Дзержинск', 'Братск', 'Ангарск', 'Псков', 'Бийск',
  'Армавир', 'Рыбинск', 'Абакан', 'Северодвинск', 'Сызрань', 'Норильск', 'Пятигорск', 'Кисловодск', 'Майкоп',
  'Чита', 'Орск', 'Благовещенск',
]

/** Сокращения, по которым нельзя назвать город: «Нижний» — ещё и Нижний Тагил, «Ростов» — ещё и Великий. */
const AMBIGUOUS_ALIASES: ReadonlySet<string> = new Set(['нижний', 'ростов'])

/** Составные названия: «в Ростове-на-Дону», «из Нижнего Новгорода». */
const FULL_NAMES: Record<string, RegExp> = {
  'ростов-на-дону': /(?<![\p{L}])ростов(?:е|а|у|ом)?-на-дону/u,
  'нижний новгород': /(?<![\p{L}])нижн\p{L}+\s+новгород/u,
}

const ENDINGS = ['а', 'я', 'ы', 'и', 'е', 'у', 'ю', 'ь', 'ой', 'ей', 'ою', 'ею', 'ом', 'ем', 'ье', 'ья', 'ью']

/** Слово описания — это город в какой-то форме («Тула», «в Туле», «из Тулы»; «тулуп» — нет). */
function isForm(word: string, city: string): boolean {
  const name = letters(city)
  if (word === name) return true
  const base = name.replace(/[аяьй]$/, '')
  const rest = word.slice(base.length)
  return word.length >= 4 && word.startsWith(base) && ENDINGS.includes(rest) && !(base === name && rest === '')
}

/**
 * Город, названный в описании: единственный подходящий (в любой падежной форме или сокращением) или null —
 * ни одного или несколько, тогда не угадываем.
 */
export function findCity(description: string): string | null {
  const words = wordsOf(description).flatMap((w) => [w, ...w.split('-')])
  const found = new Set<string>()
  for (const city of CITIES) if (words.some((w) => isForm(w, city))) found.add(city)

  const text = letters(description)
  for (const [name, aliases] of Object.entries(CITY_ALIASES)) {
    // Сокращение или английское название; однословные — тоже в падежных формах («в Петербурге»)
    const named = aliases.some((alias) => {
      if (AMBIGUOUS_ALIASES.has(alias)) return false
      if (/^\p{L}+$/u.test(alias)) return words.some((w) => isForm(w, alias))
      return new RegExp(`(?<![\\p{L}])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(text)
    })
    if (named || FULL_NAMES[name]?.test(text)) found.add(display(name))
  }
  return found.size === 1 ? [...found][0] : null
}

/** «санкт-петербург» → «Санкт-Петербург», «ростов-на-дону» → «Ростов-на-Дону». */
function display(name: string): string {
  return name
    .split(/(?<=-|\s)/)
    .map((part) => (part === 'на-' || part === 'на' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
}

/** Слово — только название города (в любой форме)? «Тула», «Туле» — да; «Фотограф в Туле» — нет. */
export function isCityOnly(value: string, city: string): boolean {
  const words = wordsOf(value)
  return words.length === 1 && isForm(words[0], city)
}
