import { describe, expect, it } from 'vitest'
import { defaultTemplate } from '../data/defaultTemplate'
import { parseCardMarkdown } from './parser'
import { headTags, localBusiness, siteDescription } from './structuredData'

const barbershop = parseCardMarkdown(`---
name: Барбершоп «Борода»
title: Мужские стрижки
business: barbershop
avatar: https://example.ru/logo.png
phone: 8 (999) 123-45-67
address: ул. Ленинградская, 37
city: Самара
contacts:
  telegram: barber_ivan
  whatsapp: +7 999 123-45-67
  vk: barber_samara
  email: hello@barber.ru
---
## Услуги
:::services
title: Мужская стрижка
price: 1500
description: Машинкой и ножницами

title: Борода
price: от 800

title: Комплекс
price: 2000–2300
:::

## Часы работы
:::hours
пн–пт: 10:00–20:00
сб: круглосуточно
вс: выходной
:::

## Отзывы
:::reviews
author: Алексей
text: Лучший фейд
rating: 5

author: Ольга
text: Аккуратно
rating: 4
:::
`).data!

describe('localBusiness', () => {
  const ld = localBusiness(barbershop)!

  it('тип по виду бизнеса, название, описание, картинка, контакты', () => {
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: 'Барбершоп «Борода»',
      description: 'Мужские стрижки — Самара',
      image: 'https://example.ru/logo.png',
      telephone: '+79991234567',
      email: 'hello@barber.ru',
      address: { '@type': 'PostalAddress', streetAddress: 'ул. Ленинградская, 37', addressLocality: 'Самара', addressCountry: 'RU' },
      sameAs: ['https://t.me/barber_ivan', 'https://vk.com/barber_samara'],
    })
  })

  it('часы работы: выходной пропускается, круглосуточно — 00:00–23:59', () => {
    expect(ld.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => `https://schema.org/${day}`),
        opens: '10:00',
        closes: '20:00',
      },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['https://schema.org/Saturday'], opens: '00:00', closes: '23:59' },
    ])
  })

  it('услуги: точная цена, «от» и диапазон', () => {
    expect(ld.hasOfferCatalog).toEqual({
      '@type': 'OfferCatalog',
      name: 'Услуги',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Мужская стрижка', description: 'Машинкой и ножницами' },
          price: '1500',
          priceCurrency: 'RUB',
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Борода' },
          priceSpecification: { '@type': 'PriceSpecification', minPrice: 800, priceCurrency: 'RUB' },
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Комплекс' },
          priceSpecification: { '@type': 'PriceSpecification', minPrice: 2000, maxPrice: 2300, priceCurrency: 'RUB' },
        },
      ],
    })
  })

  it('отзывы и средняя оценка', () => {
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 2, bestRating: 5, worstRating: 1 })
    expect(ld.review).toHaveLength(2)
    expect((ld.review as object[])[0]).toEqual({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Алексей' },
      reviewBody: 'Лучший фейд',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 },
    })
  })

  it('без вида бизнеса — LocalBusiness', () => {
    expect(localBusiness({ ...barbershop, business: undefined })!['@type']).toBe('LocalBusiness')
  })

  it('визитка человека (шаблон по умолчанию) — не бизнес, разметки нет', () => {
    expect(localBusiness(parseCardMarkdown(defaultTemplate).data!)).toBeNull()
  })
})

describe('siteDescription', () => {
  it('подзаголовок с городом', () => {
    expect(siteDescription(barbershop)).toBe('Мужские стрижки — Самара')
  })

  it('без подзаголовка — начало первого текста без разметки', () => {
    const card = parseCardMarkdown(`---\nname: А\n---\n## О нас\n**Стрижём** бороды ${'очень '.repeat(40)}давно`).data!
    const description = siteDescription(card)
    expect(description.startsWith('Стрижём бороды очень')).toBe(true)
    expect(description.length).toBeLessThanOrEqual(158)
    expect(description.endsWith('…')).toBe(true)
  })
})

describe('headTags', () => {
  it('description, Open Graph и JSON-LD', () => {
    const tags = headTags(barbershop)
    expect(tags).toContain('<meta name="description" content="Мужские стрижки — Самара" />')
    expect(tags).toContain('<meta property="og:title" content="Барбершоп «Борода»" />')
    expect(tags).toContain('<meta property="og:image" content="https://example.ru/logo.png" />')
    const json = tags.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1]
    expect(JSON.parse(json)['@type']).toBe('HairSalon')
  })

  it('кавычки экранируются, «</script>» в данных не закрывает тег', () => {
    const tags = headTags({ ...barbershop, name: 'Студия "Ноготок" </script><b>', title: 'А & Б' })
    expect(tags).toContain('content="Студия &quot;Ноготок&quot; &lt;/script&gt;&lt;b&gt;"')
    expect(tags.match(/<\/script>/g)).toHaveLength(1)
    expect(tags).toContain('\\u003c/script>')
  })
})
