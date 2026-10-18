// Ссылки на карты по адресу: без координат и ключей — Яндекс и 2ГИС сами ищут место по тексту.
import type { CardData } from '../types/card.ts'

/**
 * Что искать на карте: адрес из блока :::map или из шапки, с городом впереди («Самара, ул. Ленина, 10»).
 * null — адреса нет (одного города мало: карта покажет весь город).
 */
export function mapQuery(card: Pick<CardData, 'city' | 'address'>, blockAddress?: string): string | null {
  const address = (blockAddress ?? card.address)?.trim()
  if (!address) return null
  const city = card.city?.trim()
  // Город уже есть в адресе — второй раз не добавляем
  return city && !address.toLowerCase().includes(city.toLowerCase()) ? `${city}, ${address}` : address
}

export interface MapLinks {
  /** Встраиваемая карта (iframe) */
  widget: string
  yandex: string
  twoGis: string
}

export function mapLinks(query: string): MapLinks {
  const text = encodeURIComponent(query)
  return {
    widget: `https://yandex.ru/map-widget/v1/?text=${text}&z=16`,
    yandex: `https://yandex.ru/maps/?text=${text}`,
    twoGis: `https://2gis.ru/search/${text}`,
  }
}
