// Удобства (:::amenities): фиксированный список key с русским названием, привычными написаниями и словами,
// по которым проверка по описанию (groundAmenities.ts) подтверждает удобство. Иконки — в src/themes/shared/Icons.tsx
// (отдельный набор от ICONS: имена удобств не должны попадать в иконки карточек и промпт).

export interface AmenityDefinition {
  /** Название по умолчанию — показывается на сайте */
  label: string
  /**
   * Фразы-подтверждения в описании (без учёта регистра, ё = е). Нарочно узкие: «кофе» у кофейни — товар, а не удобство,
   * «детская стрижка» — не детская зона, «принимаю дома» — не выезд. Сомнение — в пользу удаления: клиент придёт за
   * удобством, которого нет.
   */
  phrases: RegExp[]
  /** Привычные написания key по-русски и иначе — для подсказки «возможно, вы имели в виду» */
  aliases: string[]
}

/** Граница слова для кириллицы и латиницы (у \b в JS кириллица — не «буква»). */
const W = '(?<![\\p{L}\\d])'
const re = (source: string) => new RegExp(source.replaceAll('<W>', W), 'iu')

export const AMENITIES = {
  parking: {
    label: 'Парковка',
    phrases: [re('<W>(?:парковк|припарков|стоянк)')],
    aliases: ['парковка', 'парковки', 'стоянка', 'parking'],
  },
  wifi: {
    label: 'Wi-Fi',
    phrases: [re('<W>(?:wi[\\s-]?fi|вай[\\s-]?фай)'), re('<W>бесплатн\\p{L}*\\s+интернет')],
    aliases: ['wi-fi', 'wi_fi', 'wi fi', 'вайфай', 'вай-фай', 'вай фай', 'интернет', 'internet'],
  },
  card: {
    label: 'Оплата картой',
    phrases: [
      re('<W>оплат\\p{L}*\\s+(?:банковск\\p{L}*\\s+)?карт'),
      re('<W>по\\s+карт'),
      re('<W>принима\\p{L}*\\s+(?:к\\s+оплате\\s+)?карт'),
      re('<W>карт\\p{L}*\\s+принима'),
      re('<W>(?:безнал|эквайринг|терминал)'),
      re('<W>сбп(?![\\p{L}])'),
    ],
    aliases: ['карта', 'карты', 'картой', 'оплата', 'оплата картой', 'безнал', 'cards', 'payment'],
  },
  accessible: {
    label: 'Доступная среда',
    phrases: [re('<W>(?:пандус|колясоч|маломобил|инвалид)'), re('<W>доступн\\p{L}*\\s+сред'), re('<W>без\\s+ступен')],
    aliases: ['доступность', 'доступная_среда', 'пандус', 'инвалиды', 'accessibility'],
  },
  kids: {
    label: 'Можно с детьми',
    phrases: [
      re('<W>детск\\p{L}*\\s+(?:уголок|уголк|зон|комнат)'),
      re('<W>с\\s+детьми'),
      re('<W>с\\s+реб[её]нком'),
    ],
    aliases: ['дети', 'детям', 'с_детьми', 'детская', 'детский_уголок', 'children', 'child'],
  },
  pets: {
    label: 'Можно с животными',
    phrases: [re('<W>с\\s+(?:животн|собак|питомц|кошк)'), re('<W>pet[\\s-]?friendly')],
    aliases: ['животные', 'питомцы', 'собаки', 'с_животными', 'pet', 'animals'],
  },
  coffee: {
    label: 'Кофе и чай для гостей',
    phrases: [
      re('<W>(?:кофе|чай)(?:\\s*(?:/|,|или|и)\\s*(?:кофе|чай))*\\s+для\\s+(?:гостей|клиентов|посетителей)'),
      re('<W>бесплатн\\p{L}*\\s+(?:кофе|чай)'),
      re('<W>угощаем'),
    ],
    aliases: ['кофе', 'чай', 'напитки', 'tea'],
  },
  waiting: {
    label: 'Зона ожидания',
    phrases: [re('<W>(?:зон|комнат|зал|уголок|уголк)\\p{L}*\\s+ожидани'), re('<W>ожидани\\p{L}*\\s+для\\s+(?:гостей|клиентов)')],
    aliases: ['ожидание', 'зона_ожидания', 'ожидания'],
  },
  delivery: {
    label: 'Доставка',
    phrases: [re('<W>(?:доставк|доставля|привез[её]м|курьер)')],
    aliases: ['доставка', 'курьер'],
  },
  ac: {
    label: 'Кондиционер',
    phrases: [re('<W>(?:кондиционер|климат[\\s-]?контрол)')],
    aliases: ['кондиционер', 'кондей', 'conditioner', 'aircon'],
  },
  wardrobe: {
    label: 'Гардероб',
    phrases: [re('<W>(?:гардероб|раздевалк)')],
    aliases: ['гардероб', 'раздевалка', 'cloakroom'],
  },
  online: {
    label: 'Онлайн-формат',
    phrases: [re('<W>(?:онлайн|online|дистанцион)'), re('<W>(?:zoom|зум|skype|скайп|google\\s+meet)')],
    aliases: ['онлайн', 'дистанционно', 'дистанционные'],
  },
  visit: {
    label: 'Выезд к клиенту',
    phrases: [re('<W>(?:выезд|выезж)'), re('<W>приед\\p{L}*\\s+к\\s+вам'), re('<W>на\\s+дом\\s+к\\s+клиент')],
    aliases: ['выезд', 'выезжаю', 'на_дом', 'на_дому', 'home_visit'],
  },
  certificate: {
    label: 'Подарочные сертификаты',
    phrases: [re('<W>подарочн\\p{L}*\\s+сертификат'), re('<W>сертификат\\p{L}*\\s+в\\s+подарок')],
    aliases: ['сертификат', 'сертификаты', 'подарок', 'gift', 'подарочный_сертификат'],
  },
} as const satisfies Record<string, AmenityDefinition>

export type AmenityKey = keyof typeof AMENITIES

export const AMENITY_KEYS = Object.keys(AMENITIES) as [AmenityKey, ...AmenityKey[]]

/** Привычные написания → key (для подсказки при неизвестном key). */
export const AMENITY_ALIASES: Record<string, AmenityKey> = Object.fromEntries(
  AMENITY_KEYS.flatMap((key) => AMENITIES[key].aliases.map((alias) => [alias, key] as const)),
)

/** «parking — Парковка, wifi — Wi-Fi, …» для справки и промпта. */
export const AMENITY_LIST = AMENITY_KEYS.map((key) => `${key} — ${AMENITIES[key].label}`).join(', ')
