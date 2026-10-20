// Ручные тесты автора 20.10.2026 (experiments/manual-tests-2026-10-20.md): описание и итоговый документ, как его
// увидел пользователь (промпт f856768f49ed, обработка 490b34d6f775). Модель не указана — в заметках её нет.
// Описание английского теста (кофейня) автор прислал отдельно — в заметках только итог.
export interface ManualRun {
  id: string
  model: string | null
  business: string
  description: string
  markdown: string
}

export const MANUAL_RUNS: ManualRun[] = [
  {
    "id": "m1-nails-tolyatti",
    "model": null,
    "business": "nails",
    "description": "Студия маникюра «Лапки» в Тольятти, ул. Мира 25, 2 этаж. Маникюр с покрытием 1800, без покрытия 900, педикюр 2200, снятие 300. Работаю пн–сб с 9 до 20. Запись в телеграм @lapki_tlt или по телефону 8 937 111-22-33",
    "markdown": "---\nname: Студия маникюра «Лапки»\ntitle: Профессиональный маникюр и педикюр в Тольятти\ntheme: minimal\naccent: \"#ffd700\"\nbusiness: nails\nphone: +7 937 111-22-33\naddress: ул. Мира 25, 2 этаж\ncity: Тольятти\ncontacts:\n  telegram: lapki_tlt\n  primary: telegram\n---\n\n## О нас\nСтудия маникюра «Лапки» приглашает вас насладиться профессиональным уходом за руками и ногами. Мы находимся в Тольятти по адресу ул. Мира 25, 2 этаж. Предлагаем широкий спектр услуг, чтобы ваши ногти всегда выглядели безупречно.\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием\nprice: 1800\n\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Педикюр\nprice: 2200\n\ntitle: Снятие покрытия\nprice: 300\n:::\n\n## Часы работы\n:::hours\nпн–сб: 9:00–20:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "m2-photographer",
    "model": "GigaChat-3-Lightning",
    "business": "photographer",
    "description": "Фотограф Мария, Екатеринбург. Снимаю семьи, свадьбы, love story. Час съёмки 4000, свадьба целый день 35000. Выезжаю по городу и области. Портфолио и запись: инстаграм maria_foto_ekb, вотсап +79221234567",
    "markdown": "---\nname: Фотограф Мария\ntitle: Снимаю семьи, свадьбы, love story в Екатеринбурге и области\ntheme: glass\naccent: \"#c0392b\"\nbusiness: photographer\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  instagram: maria_foto_ekb\n  whatsapp: +7 922 123-45-67\n---\n\n## О нас\nФотограф из Екатеринбурга. Снимаю семьи, свадьбы, love story.\n\n## Услуги\n:::services\ntitle: Час съёмки\nprice: 4000\ndescription: Семейные, свадебные, love story\n\ntitle: Свадьба (целый день)\nprice: 35000\n:::\n\n## Как добраться\nКарта не нужна — работаю по городу и области.\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Запись через инстаграм или вотсап.\n\ntitle: Где посмотреть портфолио?\ncontent: В профиле Instagram.\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "m3-tutor",
    "model": "GigaChat-2-Pro",
    "business": "tutor",
    "description": "Илья, репетитор по физике и информатике. Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок). 1000 за урок 45 мин, ЕГЭ 1300 за 60 мин. Пишите в тг fizika_ilya",
    "markdown": "---\nname: Репетитор Илья\ntitle: Подготовка к ЕГЭ по физике и информатике для 9–11 классов\ntheme: minimal\naccent: \"#4d79ff\"\nbusiness: tutor\naddress: Академгородок\ncity: Новосибирск\ncurrency: RUB\ncontacts:\n  telegram: fizika_ilya\n  primary: telegram\n---\n\n## О нас\nРепетитор Илья предлагает подготовку к экзаменам ЕГЭ по физике и информатике для учеников 9–11 классов. Занятия проходят онлайн или лично в Академгородке, Новосибирск.\n\n## Услуги и цены\n:::services\ntitle: Урок по физике или информатике\nprice: 1000\nduration: 45 мин\n\ntitle: Подготовка к ЕГЭ по физике или информатике\nprice: 1300\nduration: 60 мин\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "m4-minimal-input",
    "model": "GigaChat-3-Lightning",
    "business": "nails",
    "description": "Маникюр тольятти",
    "markdown": "---\nname: Маникюр Тольятти\ntitle: Мастер маникюра в Тольятти\ntheme: auto\naccent: \"#c0392b\"\nbusiness: nails\ncurrency: RUB\ncontacts:\n  primary: telegram\n---\n\n## О нас\nМастер маникюра в Тольятти. Выполняю маникюр на дому.\n\n## Услуги и цены\n:::services\ntitle: Маникюр — из описания\nprice: 1500\nduration: 60 мин\n\ntitle: Педикюр — из описания\nprice: от 800\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться? — из описания\ncontent: Записаться можно через сообщения в Telegram или WhatsApp.\n\ntitle: Можно ли сделать срочный маникюр? — из описания\ncontent: Срочный маникюр возможен по договоренности.\n:::\n"
  },
  {
    "id": "m5-car-service",
    "model": "GigaChat-3-Lightning",
    "business": "other",
    "description": "Автосервис «Гараж», Самара, замена масла 800, шиномонтаж от 1500, звоните 8-846-200-30-40",
    "markdown": "---\nname: Автосервис «Гараж»\ntitle: Ремонт и обслуживание автомобилей в Самаре\ntheme: minimal\naccent: \"#c0392b\"\nbusiness: other\nphone: +7 846 200-30-40\ncity: Самара\ncurrency: RUB\ncontacts:\n  primary: phone\n---\n\n## Услуги и цены\n:::services\ntitle: Замена масла\nprice: 800\n\ntitle: Шиномонтаж\nprice: от 1500\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: выходной\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Часто задаваемые вопросы — из описания\ncontent: Ответ на вопрос — из описания\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "m6-no-punctuation",
    "model": null,
    "business": "barbershop",
    "description": "барбершоп борода стрижка 1500 борода 800 тг ivan_borodach работаем каждый день 10 20 казань баумана 15",
    "markdown": "---\nname: Барбершоп «Борода»\ntitle: Стрижки и бритьё в Казани\ntheme: glass\naccent: \"#c0392b\"\nbusiness: barbershop\ncity: Казань\naddress: ул. Баумана, 15\ncurrency: RUB\ncontacts:\n  primary: telegram\n---\n\n## О нас\nБарбершоп «Борода» — работаем ежедневно с 10 до 20. Делаем мужские стрижки за 1500 руб., бороду — от 800 руб.\n\n## Услуги и цены\n:::services\ntitle: Мужская стрижка\nprice: 1500\ndescription: Из описания\n\ntitle: Борода\nprice: 800\n:::\n\n## Часы работы\n:::hours\nежедневно: 10:00–20:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Как добраться?\ncontent: Адрес: ул. Баумана, 15. Работаем каждый день с 10 до 20.\n:::\n\n## Как добраться\n:::map\naddress: ул. Баумана, 15\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "m7-english",
    "model": null,
    "business": "other",
    "description": "Coffee shop in Moscow, latte 250, cappuccino 230, open daily 8–22, telegram coffee_msk",
    "markdown": "---\nname: Coffee shop в Москве\ntitle: Кофейня с кофе и десертами, открытая 8–22\ntheme: glass\naccent: \"#c0392b\"\nbusiness: other\nphone:\ncontacts:\n  telegram: coffee_msk\ncurrency: RUB\ncity: Москва\naddress: ул. Ленина, 15\n---\n\n## О нас\nКофейня в Москве, где можно выпить свежесваренный кофе и взять десерты. Работаем ежедневно с 8 до 22.\n\n## Услуги и цены\n:::services\ntitle: Латте\nprice: 250\n\ntitle: Капучино\nprice: 230\n:::\n\n## Часы работы\n:::hours\nежедневно: 8:00–22:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Какие напитки есть?\ncontent: Есть латте и капучино по ценам из меню.\n\ntitle: Когда вы работаете?\ncontent: С 8 утра до 10 вечера каждый день.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  }
]
