// Тесты фиксируют ТЕКУЩЕЕ поведение парсера перед рефакторингом (этап 2).
// Странности помечены комментарием «текущее поведение»: их не чиним здесь,
// но при рефакторинге решаем осознанно — оставить или исправить вместе с тестом.
import { describe, expect, it } from 'vitest'
import { defaultTemplate } from '../data/defaultTemplate'
import type { CardData } from '../types/card'
import {
  detectSectionType,
  parseAccordion,
  parseCardGrid,
  parseCardMarkdown,
  parseCards,
  parseCodeBlock,
  parseTable,
} from './parser'

/** Парсит карточку и падает, если парсер вернул ошибку. */
function parseOk(markdown: string): CardData {
  const result = parseCardMarkdown(markdown)
  expect(result.error).toBeNull()
  expect(result.data).not.toBeNull()
  return result.data!
}

/** Карточка с заданным frontmatter (name добавляется автоматически) и телом. */
function card(frontmatter: string, body = ''): string {
  return `---\nname: Тест\n${frontmatter}\n---\n${body}`
}

describe('parseCardMarkdown: frontmatter и обязательные поля', () => {
  it('без frontmatter возвращает ошибку про name', () => {
    const result = parseCardMarkdown('## О себе\nТекст')
    expect(result.data).toBeNull()
    expect(result.error).toBe('Укажите имя в frontmatter: name: ...')
  })

  it('frontmatter без name возвращает ошибку', () => {
    const result = parseCardMarkdown('---\ntitle: Барбер\n---\n')
    expect(result.data).toBeNull()
    expect(result.error).toMatch(/Укажите имя/)
  })

  it('name из одних пробелов считается пустым', () => {
    expect(parseCardMarkdown('---\nname: "   "\n---\n').error).toMatch(/Укажите имя/)
  })

  it('битый YAML молча игнорируется — получаем ту же ошибку про name, без позиции', () => {
    // текущее поведение: причина (синтаксис YAML) пользователю не сообщается
    const result = parseCardMarkdown('---\nname: [Тест\n---\n')
    expect(result.data).toBeNull()
    expect(result.error).toMatch(/Укажите имя/)
  })

  it('минимальная карточка получает значения по умолчанию', () => {
    expect(parseOk('---\nname: Анна\n---\n')).toEqual({
      name: 'Анна',
      title: '',
      theme: 'auto',
      accent: 'auto',
      avatar: undefined,
      location: undefined,
      links: [],
      sections: [],
    })
  })

  it('читает name, title, avatar, location и обрезает пробелы', () => {
    const data = parseOk(
      '---\nname: "  Анна  "\ntitle: " Мастер маникюра "\navatar: https://example.com/a.png\nlocation: Казань\n---\n',
    )
    expect(data.name).toBe('Анна')
    expect(data.title).toBe('Мастер маникюра')
    expect(data.avatar).toBe('https://example.com/a.png')
    expect(data.location).toBe('Казань')
  })

  it('числовое имя приводится к строке', () => {
    expect(parseOk('---\nname: 42\n---\n').name).toBe('42')
  })

  it('понимает переводы строк Windows (CRLF) во frontmatter', () => {
    const data = parseOk('---\r\nname: Анна\r\ntitle: Фотограф\r\n---\r\n')
    expect(data.name).toBe('Анна')
    expect(data.title).toBe('Фотограф')
  })
})

describe('theme', () => {
  it.each([
    ['glass', 'glass'],
    ['minimal', 'minimal'],
    ['noir', 'noir'],
    ['vercel', 'vercel'],
    ['auto', 'auto'],
    ['NOIR', 'noir'],
    ['"  Minimal  "', 'minimal'],
    ['"noir # тёмная"', 'noir'],
    ['neon', 'auto'],
    ['123', 'auto'],
  ])('theme: %s → %s', (raw, expected) => {
    expect(parseOk(card(`theme: ${raw}`)).theme).toBe(expected)
  })

  it('без theme — auto', () => {
    expect(parseOk(card('')).theme).toBe('auto')
  })
})

describe('accent', () => {
  it.each([
    ['"#abc"', '#aabbcc'],
    ['"#ABC"', '#aabbcc'],
    ['"#abcd"', '#aabbcc'], // альфа-канал отбрасывается
    ['"#1a2b3c"', '#1a2b3c'],
    ['"#11223344"', '#112233'], // альфа-канал отбрасывается
    ['abc', '#aabbcc'], // без решётки тоже работает
    ['"#ff0000 #красный"', '#ff0000'], // inline-комментарий внутри кавычек
    ['auto', 'auto'],
    ['red', 'auto'], // названия цветов не поддерживаются
    ['"#12345"', 'auto'],
    ['""', 'auto'],
  ])('accent: %s → %s', (raw, expected) => {
    expect(parseOk(card(`accent: ${raw}`)).accent).toBe(expected)
  })

  it('без кавычек #abc — это YAML-комментарий, значение пустое → auto', () => {
    // текущее поведение: частая ошибка ручной правки, сейчас никак не подсвечивается
    expect(parseOk(card('accent: #abc')).accent).toBe('auto')
  })

  it('число из шести цифр YAML отдаёт числом — становится цветом', () => {
    expect(parseOk(card('accent: 123456')).accent).toBe('#123456')
  })
})

describe('links', () => {
  it('читает ссылки, icon необязателен', () => {
    const data = parseOk(
      card(
        'links:\n  - label: Telegram\n    url: https://t.me/anna\n    icon: telegram\n  - label: Сайт\n    url: https://anna.ru',
      ),
    )
    expect(data.links).toEqual([
      { label: 'Telegram', url: 'https://t.me/anna', icon: 'telegram' },
      { label: 'Сайт', url: 'https://anna.ru', icon: undefined },
    ])
  })

  it('отбрасывает ссылки без label или url и элементы-строки', () => {
    const data = parseOk(
      card('links:\n  - label: Без url\n  - url: https://no-label.ru\n  - просто строка\n  - label: Ок\n    url: tel:+79990000000'),
    )
    expect(data.links).toEqual([{ label: 'Ок', url: 'tel:+79990000000', icon: undefined }])
  })

  it('links не списком — пустой массив', () => {
    expect(parseOk(card('links: https://t.me/anna')).links).toEqual([])
  })
})

describe('секции', () => {
  it('## Заголовок начинает секцию, содержимое обрезается', () => {
    const data = parseOk(card('', '## О себе\n\nСтригу бороды.\n\n## Адрес\nул. Ленина, 1\n'))
    expect(data.sections).toEqual([
      { title: 'О себе', content: 'Стригу бороды.', type: 'text' },
      { title: 'Адрес', content: 'ул. Ленина, 1', type: 'text' },
    ])
  })

  it('текст до первого ## становится секцией без названия', () => {
    const data = parseOk(card('', 'Вступление\n## Раздел\nТекст'))
    expect(data.sections.map((s) => [s.title, s.content])).toEqual([
      ['', 'Вступление'],
      ['Раздел', 'Текст'],
    ])
  })

  it('## без названия внутри секции — разделитель ***', () => {
    const data = parseOk(card('', '## Опыт\nПервое место\n##\nВторое место'))
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].content).toBe('Первое место\n***\nВторое место')
  })

  it('## без названия в самом начале открывает безымянную секцию', () => {
    const data = parseOk(card('', '##\nТекст'))
    expect(data.sections).toEqual([{ title: '', content: 'Текст', type: 'text' }])
  })

  it('пустые секции отбрасываются', () => {
    const data = parseOk(card('', '## Пусто\n\n## Есть\nТекст\n## Тоже пусто\n'))
    expect(data.sections.map((s) => s.title)).toEqual(['Есть'])
  })

  it('### и # не считаются заголовками секций', () => {
    const data = parseOk(card('', '## Раздел\n### Подзаголовок\n# Крупный'))
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].content).toBe('### Подзаголовок\n# Крупный')
  })

  it('## без пробела после решёток не заголовок', () => {
    // текущее поведение: «##Цены» уходит в текст предыдущей секции
    const data = parseOk(card('', '## Раздел\n##Цены'))
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].content).toBe('##Цены')
  })

  it('## внутри :::code не режет секцию', () => {
    const data = parseOk(card('', '## Пример\n:::code lang="md"\n## не заголовок\n:::\n## Дальше\nТекст'))
    expect(data.sections.map((s) => s.title)).toEqual(['Пример', 'Дальше'])
    expect(data.sections[0].code).toEqual({ lang: 'md', code: '## не заголовок' })
  })

  it('незакрытый ::: поглощает все следующие секции', () => {
    // текущее поведение: ошибка ручной правки, сейчас без предупреждения
    const data = parseOk(card('', '## FAQ\n:::accordion\ntitle: Вопрос\ncontent: Ответ\n## Контакты\nТелефон'))
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].title).toBe('FAQ')
    expect(data.sections[0].content).toContain('## Контакты')
  })

  it('заголовки с CRLF не распознаются', () => {
    // текущее поведение: тело делится только по \n, «\r» мешает регулярке заголовка
    const data = parseOk('---\r\nname: Анна\r\n---\r\n## О себе\r\nТекст\r\n')
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].title).toBe('')
    expect(data.sections[0].content).toContain('## О себе')
  })

  it('к секции прикрепляются данные её типа', () => {
    const data = parseOk(card('', '## Цены\n| Услуга | Цена |\n|---|---|\n| Стрижка | 1500 |'))
    expect(data.sections[0].type).toBe('table')
    expect(data.sections[0].table).toEqual({ headers: ['Услуга', 'Цена'], rows: [['Стрижка', '1500']] })
  })
})

describe('detectSectionType', () => {
  it.each<[string, string]>([
    ['Просто текст', 'text'],
    ['| a | b |\n|---|---|\n| 1 | 2 |', 'table'],
    ['| a | b |\n| 1 | 2 |', 'table'], // без разделителя, но две строки в пайпах
    ['a | b', 'text'],
    [':::code\nx\n:::', 'code-block'],
    [':::accordion\ntitle: a\n:::', 'accordion'],
    [':::cards\ntitle: a\n:::', 'card-grid'],
    [':::CARDS\ntitle: a\n:::', 'card-grid'], // имя блока без учёта регистра
    [':::unknown\nx\n:::', 'text'],
  ])('%j → %s', (content, expected) => {
    expect(detectSectionType(content)).toBe(expected)
  })

  it('приоритет: code важнее accordion и cards', () => {
    expect(detectSectionType(':::cards\ntitle: a\n:::\n:::code\nx\n:::')).toBe('code-block')
    expect(detectSectionType(':::cards\ntitle: a\n:::\n:::accordion\ntitle: b\n:::')).toBe('accordion')
  })

  it('текст с пайпом и горизонтальной линией --- считается таблицей', () => {
    // текущее поведение: «---» распознаётся как строка-разделитель таблицы
    expect(detectSectionType('Стрижка | укладка\n---')).toBe('table')
  })
})

describe('parseTable', () => {
  it('заголовки и строки, разделитель пропускается', () => {
    expect(parseTable('| Услуга | Цена |\n|:---|---:|\n| Стрижка | 1500 |\n| Борода | 800 |')).toEqual({
      headers: ['Услуга', 'Цена'],
      rows: [
        ['Стрижка', '1500'],
        ['Борода', '800'],
      ],
    })
  })

  it('без внешних пайпов', () => {
    expect(parseTable('Услуга | Цена\n--- | ---\nСтрижка | 1500')).toEqual({
      headers: ['Услуга', 'Цена'],
      rows: [['Стрижка', '1500']],
    })
  })

  it('строки подгоняются под число заголовков', () => {
    expect(parseTable('| a | b | c |\n|---|---|---|\n| 1 |\n| 1 | 2 | 3 | 4 |').rows).toEqual([
      ['1', '', ''],
      ['1', '2', '3'],
    ])
  })

  it('строки без пайпа игнорируются', () => {
    expect(parseTable('Подпись\n| a |\n| 1 |')).toEqual({ headers: ['a'], rows: [['1']] })
  })

  it('без пайпов — пустая таблица', () => {
    expect(parseTable('текст')).toEqual({ headers: [], rows: [] })
  })
})

describe('parseAccordion', () => {
  it('элементы разделяются пустой строкой', () => {
    expect(
      parseAccordion(':::accordion\ntitle: Сколько стоит?\ncontent: От 1500 ₽\n\ntitle: Где вы?\ncontent: Центр\n:::'),
    ).toEqual([
      { title: 'Сколько стоит?', content: 'От 1500 ₽' },
      { title: 'Где вы?', content: 'Центр' },
    ])
  })

  it('строки без ключа дописываются к предыдущему полю через пробел', () => {
    expect(parseAccordion(':::accordion\ntitle: Вопрос\ncontent: Первая строка\nвторая строка\n:::')).toEqual([
      { title: 'Вопрос', content: 'Первая строка вторая строка' },
    ])
  })

  it('кириллическое «Слово: …» в продолжении остаётся текстом', () => {
    expect(parseAccordion(':::accordion\ntitle: Вопрос\ncontent: Ответ\nВажно: приходите заранее\n:::')).toEqual([
      { title: 'Вопрос', content: 'Ответ Важно: приходите заранее' },
    ])
  })

  it('латинское «word: …» в продолжении становится новым полем и теряется', () => {
    // текущее поведение: ключ — любое латинское слово, поэтому теряются «Note: …» и даже ссылка «https://…»
    expect(
      parseAccordion(':::accordion\ntitle: Вопрос\ncontent: Ответ\nNote: заранее\nhttps://t.me/anna\n:::'),
    ).toEqual([{ title: 'Вопрос', content: 'Ответ' }])
  })

  it('ключи без учёта регистра, лишние поля игнорируются', () => {
    expect(parseAccordion(':::accordion\nTITLE: Вопрос\nContent: Ответ\nextra: x\n:::')).toEqual([
      { title: 'Вопрос', content: 'Ответ' },
    ])
  })

  it('пустые элементы отбрасываются, у неполных — пустая строка', () => {
    expect(parseAccordion(':::accordion\ntitle: Только вопрос\n\nчто-то без ключа\n:::')).toEqual([
      { title: 'Только вопрос', content: '' },
    ])
  })

  it('без закрывающего ::: читается до конца', () => {
    expect(parseAccordion(':::accordion\ntitle: В\ncontent: О')).toEqual([{ title: 'В', content: 'О' }])
  })

  it('без блока :::accordion — пустой список', () => {
    expect(parseAccordion('title: В\ncontent: О')).toEqual([])
  })
})

describe('parseCodeBlock', () => {
  it('язык из lang="..." в нижнем регистре', () => {
    expect(parseCodeBlock(':::code lang="TypeScript"\nconst a = 1\n:::')).toEqual({
      lang: 'typescript',
      code: 'const a = 1',
    })
  })

  it.each([
    [":::code lang='py'", 'py'],
    [':::code lang=c++', 'c++'],
    [':::code lang="c#"', 'c#'],
    [':::code', ''],
  ])('%s → lang %j', (open, lang) => {
    expect(parseCodeBlock(`${open}\nx\n:::`).lang).toBe(lang)
  })

  it('сохраняет пустые строки и отступы внутри кода', () => {
    expect(parseCodeBlock(':::code\nif (a) {\n  b()\n\n}\n:::').code).toBe('if (a) {\n  b()\n\n}')
  })

  it('отступ первой строки кода срезается', () => {
    // текущее поведение: тело блока целиком проходит через trim()
    expect(parseCodeBlock(':::code\n    indented\n:::').code).toBe('indented')
  })

  it('без закрывающего ::: код идёт до конца', () => {
    expect(parseCodeBlock(':::code lang="js"\nlet x').code).toBe('let x')
  })

  it('без блока :::code весь текст считается кодом', () => {
    expect(parseCodeBlock('  plain  ')).toEqual({ lang: '', code: 'plain' })
  })
})

describe('parseCardGrid', () => {
  it('все поля карточки', () => {
    expect(
      parseCardGrid(
        ':::cards\ntitle: Стрижка\ndescription: Машинкой и ножницами\nicon: star\nurl: https://t.me/barber\ntags: мужская, детская; борода\n:::',
      ),
    ).toEqual([
      {
        title: 'Стрижка',
        description: 'Машинкой и ножницами',
        icon: 'star',
        url: 'https://t.me/barber',
        tags: ['мужская', 'детская', 'борода'],
      },
    ])
  })

  it('необязательные поля — undefined, link — синоним url', () => {
    expect(parseCardGrid(':::cards\ntitle: A\nlink: https://a.ru\n\ntitle: B\nicon:\ntags: ,\n:::')).toEqual([
      { title: 'A', description: '', icon: undefined, url: 'https://a.ru', tags: undefined },
      { title: 'B', description: '', icon: undefined, url: undefined, tags: undefined },
    ])
  })

  it('url важнее link', () => {
    expect(parseCardGrid(':::cards\ntitle: A\nurl: https://u.ru\nlink: https://l.ru\n:::')[0].url).toBe('https://u.ru')
  })

  it('карточка только со ссылкой сохраняется, совсем пустая — нет', () => {
    expect(parseCardGrid(':::cards\nurl: https://a.ru\n\nicon: star\n:::')).toEqual([
      { title: '', description: '', icon: undefined, url: 'https://a.ru', tags: undefined },
    ])
  })

  it('многострочное описание склеивается', () => {
    expect(parseCardGrid(':::cards\ntitle: A\ndescription: строка один\nстрока два\n:::')[0].description).toBe(
      'строка один строка два',
    )
  })

  it('parseCards — синоним parseCardGrid', () => {
    expect(parseCards).toBe(parseCardGrid)
  })
})

describe('шаблон по умолчанию', () => {
  it('парсится без ошибок и даёт ожидаемые секции', () => {
    const data = parseOk(defaultTemplate)
    expect(data.name).toBe('Алексей Иванов')
    expect(data.links).toHaveLength(3)
    expect(data.sections.map((s) => [s.title, s.type])).toEqual([
      ['О себе', 'text'],
      ['Навыки', 'text'],
      ['Опыт', 'text'],
      ['Проекты', 'card-grid'],
      ['Технологии', 'table'],
      ['Пример кода', 'code-block'],
      ['FAQ', 'accordion'],
      ['Контакты', 'text'],
    ])
    expect(data.sections[2].content).toContain('***')
    expect(data.sections[3].cards).toHaveLength(2)
    expect(data.sections[4].table?.rows).toHaveLength(3)
    expect(data.sections[5].code?.lang).toBe('typescript')
    expect(data.sections[6].accordion).toHaveLength(2)
  })
})
