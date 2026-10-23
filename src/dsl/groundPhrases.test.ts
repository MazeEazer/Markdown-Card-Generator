import { describe, expect, it } from 'vitest'
import { findPhraseHits, findUngroundedPhrases, PHRASES, removeUngroundedPhrases, UNGROUNDED_PHRASE } from './groundPhrases.ts'

const HEAD = '---\nname: Зерно\nphone: +7 999 123-45-67\n---\n\n'
const about = (body: string) => `${HEAD}## О нас\n${body}\n`
const titled = (title: string) => `---\nname: Зерно\ntitle: ${title}\nphone: +7 999 123-45-67\n---\n\n## О нас\nТекст\n`
const service = (title: string, description = '') => `${HEAD}## Услуги\n:::services\ntitle: ${title}\nprice: 200${description ? `\ndescription: ${description}` : ''}\n:::\n`

/** Фразы, найденные в тексте раздела при данном описании. */
const fragments = (text: string, description: string) => findPhraseHits(text, description).map((h) => h.fragment.toLowerCase())
/** Подтверждает ли описание фразу из текста раздела: нет находок — подтверждает. */
const confirmed = (phrase: string, description: string) => fragments(about(phrase), description).length === 0

describe('findUngroundedPhrases: диагностика', () => {
  it('ошибка с фрагментом и местом', () => {
    const text = titled('Кофе с собой')
    const [d] = findUngroundedPhrases(text, 'Кофейня «Зерно», Самара')
    expect(d).toMatchObject({ severity: 'error', code: UNGROUNDED_PHRASE, message: 'Уберите «с собой» из title — этого нет в описании' })
    expect(text.slice(d.from, d.to)).toBe('с собой')
  })

  it('место называется по типу: текст раздела, название и описание услуги', () => {
    expect(findUngroundedPhrases(about('Лучшие напитки'), 'Кофейня')[0].message).toBe('Уберите «Лучшие» из текста раздела — этого нет в описании')
    expect(findUngroundedPhrases(service('Кофе с собой'), 'Кофе')[0].message).toContain('из названия услуги')
    expect(findUngroundedPhrases(service('Кофе', 'Опыт бариста'), 'Кофе')[0].message).toContain('из описания услуги')
  })

  it('подтверждённое описанием не трогаем', () => {
    expect(findUngroundedPhrases(titled('Кофе с собой'), 'Кофе с собой и на месте')).toEqual([])
  })

  it('проверяем только свободный текст: отзывы, карточки, вопросы, name — нет', () => {
    const text = `---\nname: Лучший кофе\nphone: +7 999 123-45-67\n---\n\n## Отзывы\n:::reviews\ntext: Лучший кофе в центре\n:::\n\n## Вопросы\n:::accordion\ntitle: Есть ли кофе с собой?\ncontent: Да, по записи\n:::\n\n## Карточки\n:::cards\ntitle: Гарантия качества\n:::\n`
    expect(findUngroundedPhrases(text, 'Кофейня')).toEqual([])
  })
})

describe('подтверждения и ложные совпадения', () => {
  describe('расположение', () => {
    it.each([
      ['Кофейня в центре города', 'Кофейня в центре'],
      ['Кофейня в центре города', 'Работаем в центре Самары'],
      ['Рядом с метро', 'Три минуты от метро'],
      ['В шаговой доступности', 'Всё в шаговой доступности'],
    ])('«%s» подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(true))

    it.each([
      ['Кофейня в центре города', 'Кофейня на ул. Центральной, 5'],
      ['Кофейня в центре города', 'Кофейня, Самара'],
      ['Рядом с метро', 'Кофейня у реки'],
      ['В шаговой доступности', 'Кофейня'],
    ])('«%s» не подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(false))
  })

  describe('формат', () => {
    it.each([
      ['Кофе с собой', 'Кофе с собой'],
      ['Кофе с собой', 'Продаём кофе навынос'],
      ['Кофе с собой', 'Кофе на вынос и в зале'],
      ['Проводим индивидуальные уроки', 'Занимаюсь индивидуально'],
      ['Проводим индивидуальные уроки', 'Занятия один на один'],
      ['Проводим индивидуальные уроки', 'Уроки 1 на 1'],
      ['Проводим индивидуальные уроки', 'Занимаюсь лично с каждым'],
      ['Проводим индивидуальные уроки', 'Персональные занятия'],
      ['Работаем по записи', 'Запись по телефону'],
      ['Работаем по записи', 'Записывайтесь в Telegram'],
      ['Мастер работает на дому', 'Стригу дома'],
      ['Мастер работает на дому', 'Принимаю на дому'],
      ['Мастер работает на дому', 'Выезжаю к клиенту'],
    ])('«%s» подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(true))

    it.each([
      ['Кофе с собой', 'Кофейня «Зерно»'],
      ['Кофе с собой', 'Кофе только в зале'],
      ['Проводим индивидуальные уроки', 'Репетитор по математике'],
      ['Проводим индивидуальные уроки', 'Индивидуальный подход к каждому'],
      ['Работаем по записи', 'Работаем ежедневно'],
      ['Мастер работает на дому', 'Барбершоп на Садовой'],
    ])('«%s» не подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(false))

    it('«индивидуальный подход» в тексте не ловится — это оформление', () => {
      expect(fragments(about('Индивидуальный подход к каждому клиенту'), 'Репетитор')).toEqual([])
    })

    it('«стригу дома» (клиент приходит) не подтверждает выезд к клиенту: «у вас дома», «выезд на дом»', () => {
      const description = 'Стригу дома, Самара'
      expect(confirmed('Работаю на дому', description)).toBe(true)
      expect(confirmed('Стрижка прямо у вас дома', description)).toBe(false)
      expect(confirmed('Выезд на дом к клиенту', description)).toBe(false)
      expect(confirmed('Приезжаю на дом к клиенту', description)).toBe(false)
    })

    it('выезд к клиенту подтверждает «у вас дома»', () => {
      for (const description of ['Выезжаю к клиенту', 'Выезд по городу', 'Приеду к вам домой']) {
        expect(confirmed('Стрижка у вас дома', description), description).toBe(true)
      }
    })
  })

  describe('опыт', () => {
    it.each([
      ['Большой опыт работы', 'Опыт 10 лет'],
      ['Мастер со стажем', 'Стаж пять лет'],
      ['Работаем с 2015 года', 'Работаю с 2015 года'],
    ])('«%s» подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(true))

    it.each([
      ['Большой опыт работы', 'Мастер маникюра'],
      ['Опытный фотограф', 'Фотограф Дмитрий, Санкт-Петербург'],
      ['Более 10 лет на рынке', 'Фотограф'],
      ['5 лет работы', 'Фотограф'],
    ])('«%s» не подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(false))
  })

  describe('аудитория', () => {
    it.each([
      ['Занятия для детей и взрослых', 'Занимаюсь с детьми и взрослыми'],
      ['Для всей семьи', 'Семейные фотосессии'],
      ['Подготовка к экзаменам', 'Готовлю к ЕГЭ'],
      ['Для детей', 'Детская стрижка 800'],
    ])('«%s» подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(true))

    it.each([
      ['Занятия для детей и взрослых', 'Занимаюсь с детьми'],
      ['Занятия для детей и взрослых', 'Репетитор по русскому'],
      ['Для всей семьи', 'Семь видов маникюра'],
      ['Подготовка к экзаменам', 'Репетитор по русскому, Казань'],
    ])('«%s» не подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(false))
  })

  describe('обещания и «и другое»', () => {
    it.each([
      ['Гарантия качества', 'Даю гарантию на работы'],
      ['Лучшие напитки', 'Лучший кофе в городе'],
      ['Мы №1 в городе', 'Мы №1'],
      ['Кофе, чай и другие услуги', 'Кофе, чай и другие услуги'],
      ['Стрижки и многое другое', 'Стрижки и многое другое'],
    ])('«%s» подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(true))

    it.each([
      ['Гарантия качества', 'Кофейня'],
      ['Лучшие напитки', 'Кофейня'],
      ['Мы №1 в городе', 'Кофейня 12 мест'],
      ['Лечение кариеса и другие стоматологические услуги', 'Лечение кариеса'],
      ['Стрижки и многое другое', 'Стрижка 1500'],
      ['Стрижка и т. д.', 'Стрижка 1500'],
    ])('«%s» не подтверждается: «%s»', (phrase, description) => expect(confirmed(phrase, description)).toBe(false))

    it('«лучше записаться» — не обещание «лучший»', () => {
      expect(fragments(about('Лучше записаться за день'), 'Кофейня')).toEqual([])
    })
  })

  it('каждая группа ловит свой пример (триггеры не «мёртвые»)', () => {
    const samples: Record<string, string> = {
      center: 'в центре', metro: 'рядом с метро', walking: 'в шаговой доступности', takeaway: 'с собой',
      individual: 'индивидуальные уроки', atHome: 'на дому', visitClient: 'у вас дома', byAppointment: 'по записи',
      experience: 'большой опыт', forChildren: 'для детей', forAdults: 'для взрослых', forFamily: 'для всей семьи',
      forExams: 'к экзаменам', guarantee: 'гарантия', best: 'лучшие', numberOne: '№1', andOthers: 'и другие услуги',
    }
    expect(Object.keys(PHRASES).sort()).toEqual(Object.keys(samples).sort())
    for (const [id, sample] of Object.entries(samples)) {
      expect(sample.match(PHRASES[id].trigger), id).not.toBeNull()
    }
  })
})

describe('removeUngroundedPhrases', () => {
  const DESCRIPTION = 'Кофейня «Зерно», Самара'

  it('title — поле удаляется целиком', () => {
    const result = removeUngroundedPhrases(titled('Кофе с собой'), DESCRIPTION)
    expect(result.text).toBe('---\nname: Зерно\nphone: +7 999 123-45-67\n---\n\n## О нас\nТекст\n')
    expect(result.removed).toEqual([UNGROUNDED_PHRASE])
  })

  it('название услуги — вырезается фраза', () => {
    expect(removeUngroundedPhrases(service('Кофе с собой'), DESCRIPTION).text).toBe(service('Кофе'))
    expect(removeUngroundedPhrases(service('Кофе и чай с собой'), DESCRIPTION).text).toBe(service('Кофе и чай'))
  })

  it('в названии осталась только фраза — услуга удаляется', () => {
    const text = `${HEAD}## Услуги\n:::services\ntitle: Гарантия\nprice: 100\n\ntitle: Кофе\nprice: 200\n:::\n`
    expect(removeUngroundedPhrases(text, DESCRIPTION).text).toBe(`${HEAD}## Услуги\n:::services\ntitle: Кофе\nprice: 200\n:::\n`)
  })

  it('описание услуги — предложение; ничего не осталось — поле убирается', () => {
    expect(removeUngroundedPhrases(service('Кофе', 'Опыт бариста. Свежая обжарка'), DESCRIPTION).text).toBe(service('Кофе', 'Свежая обжарка'))
    expect(removeUngroundedPhrases(service('Кофе', 'Опыт бариста — 10 лет.'), DESCRIPTION).text).toBe(service('Кофе'))
  })

  it('текст раздела — предложение целиком, остальные остаются', () => {
    const text = about('Уютная кофейня. Проводим индивидуальные уроки. Свежая обжарка.')
    expect(removeUngroundedPhrases(text, DESCRIPTION).text).toBe(about('Уютная кофейня. Свежая обжарка.'))
    // последнее предложение — пробел перед ним тоже уходит
    expect(removeUngroundedPhrases(about('Уютная кофейня. Лучшие напитки!'), DESCRIPTION).text).toBe(about('Уютная кофейня.'))
  })

  it('сокращения («ул.») не принимаются за конец предложения', () => {
    const text = about('Мы на ул. Садовой, 5, лучшие напитки в городе. Уютно.')
    expect(removeUngroundedPhrases(text, DESCRIPTION).text).toBe(about('Уютно.'))
  })

  it('строка списка удаляется целиком', () => {
    const text = about('- Свежая обжарка\n- Кофе с собой\n- Уютный зал')
    expect(removeUngroundedPhrases(text, DESCRIPTION).text).toBe(about('- Свежая обжарка\n- Уютный зал'))
  })

  it('раздел, в котором ничего не осталось, убирается вместе с заголовком', () => {
    const text = `${HEAD}## Кофе\nОтличный кофе с собой.\n\n## Контакты\n:::contacts\n:::\n`
    expect(removeUngroundedPhrases(text, DESCRIPTION).text).toBe(`${HEAD}## Контакты\n:::contacts\n:::\n`)
  })

  it('фраза подтверждена или нет фраз — текст не меняется', () => {
    const text = about('Кофе с собой и уютный зал')
    expect(removeUngroundedPhrases(text, 'Кофе с собой')).toEqual({ text, removed: [] })
    expect(removeUngroundedPhrases(about('Уютно'), DESCRIPTION)).toEqual({ text: about('Уютно'), removed: [] })
  })

  it('после удаления проверка по описанию не находит ничего', () => {
    const text = `---\nname: Зерно\ntitle: Кофе с собой в центре\nphone: +7 999 123-45-67\n---\n\n## О нас\nУютная кофейня. Проводим индивидуальные уроки. Лучшие напитки!\n\n## Услуги\n:::services\ntitle: Кофе с собой\nprice: 200\ndescription: Опыт бариста — 10 лет.\n:::\n`
    const result = removeUngroundedPhrases(text, DESCRIPTION)
    expect(result.removed).toHaveLength(findPhraseHits(text, DESCRIPTION).length)
    expect(findUngroundedPhrases(result.text, DESCRIPTION)).toEqual([])
    expect(result.text).toBe(`${HEAD}## О нас\nУютная кофейня.\n\n## Услуги\n:::services\ntitle: Кофе\nprice: 200\n:::\n`)
  })
})
