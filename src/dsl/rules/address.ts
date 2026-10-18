// Адрес без города: на карте и в поиске он может найтись в другом городе.
import type { Rule } from '../validate.ts'
import { businessFields } from './helpers.ts'

/** «г. Самара», «город Самара» внутри адреса. */
const CITY_IN_ADDRESS = /(?:^|[\s,])(?:г\.|город)\s*[А-ЯЁ]/

export const addressRule: Rule = ({ ast }) => {
  const { root } = businessFields(ast.frontmatter)
  const address = root.get('address')
  // location — старое поле «город или район одной строкой», его тоже считаем городом
  if (!address || root.has('city') || root.has('location')) return []

  const hint = CITY_IN_ADDRESS.test(address.value)
    ? 'Похоже, город написан в адресе — перенесите его в поле city'
    : 'Без него адрес на карте и в поиске может найтись в другом городе'
  return [
    {
      ...address.valueRange,
      severity: 'warning',
      code: 'address-without-city',
      message: `Укажите город (city). ${hint}`,
    },
  ]
}
