// Третий прогон шага 8 (20.10.2026): GigaChat-2-Pro и GigaChat-3-Lightning, 13 описаний × 2 режима — 52 запуска,
// обработка a235b553ba1d. Сырой ответ модели итоговой попытки (строка model журнала) и описание. Для проверки
// обработки на настоящих ответах (разбор — experiments/analysis-2026-10-20-run3.md).
export interface Step8Run3 {
  id: string
  model: string
  mode: 'markdown' | 'json'
  attempt: number
  description: string
  output: string
}

export const STEP8_RUN3_RAW: Step8Run3[] = [
  {
    "id": "1-barbershop",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "output": "---\nname: Барбершоп «Топор»\ntitle: Стрижки для мужчин и детей в центре Казани\ntheme: minimal\nbusiness: barbershop\nphone: +7 917 555-12-34\naddress: ул. Садовая, 5\ncity: Казань\ncontacts:\n  telegram: topor_kzn\n  primary: telegram\n---\n\n## О нас\nБарбершоп «Топор» приглашает мужчин и мальчиков на качественные стрижки в центре Казани. Мы находимся на улице Садовой, 5, и предлагаем классические мужские стрижки, оформление бороды и аккуратные детские стрижки.\n\n## Услуги и цены\n:::services\ntitle: Мужская стрижка\nprice: 1200\n\ntitle: Стрижка бороды\nprice: 700\n\ntitle: Детская стрижка\nprice: 900\n:::\n\n## Часы работы\n:::hours\nпн–сб: 10:00–21:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "2-tutor-online",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "output": "---\nname: Репетитор по математике Анна Сергеевна\ntitle: Подготовка к ОГЭ и ЕГЭ онлайн\nbusiness: tutor\nphone: +7 903 111-22-33\ncontacts:\n  whatsapp: +7 903 111-22-33\n  primary: whatsapp\n---\n\n## О нас\nАнна Сергеевна предлагает индивидуальные занятия по математике онлайн через платформу Zoom. Преподаватель специализируется на подготовке школьников к экзаменам ОГЭ и ЕГЭ.\n\n## Услуги и цены\n:::services\ntitle: Онлайн урок математики\nprice: 1500\nduration: 60 мин\ndescription: Индивидуальное занятие по математике через Zoom. Первое пробное занятие бесплатно.\n:::\n\n## Вопросы\n:::accordion\ntitle: Какие экзамены вы готовите?\ncontent: Готовлю учеников к сдаче ОГЭ и ЕГЭ по математике.\n\ntitle: Как проходят занятия?\ncontent: Все уроки проводятся онлайн по видеосвязи через Zoom.\n\ntitle: Есть ли бесплатное занятие?\ncontent: Да, первое пробное занятие проводится бесплатно.\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "3-nails",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "output": "---\nname: Мастер маникюра Ольга\ntitle: Качественный маникюр с покрытием гель-лак и дизайном\ntheme: minimal\nbusiness: nails\nphone: +7 912 345-67-89\naddress: ул. Малышева, 31, кабинет 12\ncity: Екатеринбург\ncontacts:\n  instagram: olga.nails.ekb\n  primary: instagram\n---\n\n## О нас\nМастер маникюра Ольга приглашает вас в уютный кабинет в Екатеринбурге на ул. Малышева, 31, где вы сможете насладиться качественным маникюром с покрытием гель-лаком и оригинальным дизайном ногтей.\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием гель-лак\nprice: 1800\n\ntitle: Снятие покрытия\nprice: 300\n\ntitle: Дизайн ногтей\nprice: от 100 за ноготь\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "4-photographer",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "output": "---\nname: Фотограф Дмитрий\ntitle: Семейные фотосессии и свадьбы в Санкт-Петербурге\ntheme: minimal\nbusiness: photographer\ncity: Санкт-Петербург\ncurrency: RUB\ncontacts:\n  telegram: dmitry_photo_spb\n  email: dmitry.photo@example.ru\n  primary: telegram\n---\n\n## О нас\nПрофессиональный фотограф Дмитрий предлагает услуги свадебной и семейной фотосъёмки в Санкт-Петербурге. Все съёмки проходят на территории клиента, выезд организуется фотографом.\n\n## Услуги и цены\n:::services\ntitle: Семейная фотосессия\nprice: 5000\nduration: час\n\ntitle: Свадьба\nprice: от 40 000\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "5-dirty",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-912-777-33-21",
    "output": "---\nname: Иван Барбер\ntitle: Стрижки для мужчин и подростков в районе Химмаш, Екатеринбург\ntheme: minimal\nbusiness: barbershop\nphone: +7 912 777-33-21\naddress: район Химмаш\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  telegram: ivan_barber\n  whatsapp: +7 912 777-33-21\n  primary: telegram\n---\n\n## О нас\nБарбер Иван предлагает стрижки для мужчин и подростков в уютном салоне в районе Химмаш, Екатеринбург. Опытный мастер выполнит аккуратную стрижку ножницами за 1500 рублей или машинкой за 800 рублей.\n\n## Услуги и цены\n:::services\ntitle: Стрижка ножницами\nprice: 1500\n\ntitle: Стрижка машинкой\nprice: 800\n:::\n\n## Часы работы\n:::hours\nпн: выходной\nвт–вс: 10:00–20:00\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "6-no-contacts",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "output": "---\nname: Студия маникюра «Лапки»\ntitle: Качественный маникюр и педикюр в Самаре\ntheme: glass\nbusiness: nails\nphone: +7 900 000-00-00\naddress: ул. Ленинградская, 40\ncity: Самара\ncurrency: RUB\ncontacts:\n  whatsapp: +7 900 000-00-00\n  primary: whatsapp\n---\n\n## О нас\nСтудия маникюра «Лапки» приглашает всех желающих на процедуры маникюра и педикюра. Мы находимся в Самаре по адресу ул. Ленинградская, 40 и работаем ежедневно с 9 до 21 часа.\n\n## Услуги и цены\n:::services\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Маникюр с покрытием\nprice: 1600\n\ntitle: Педикюр\nprice: 2200\n:::\n\n## Часы работы\n:::hours\nежедневно: 9:00–21:00\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "7-nails-floor",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Тольятти, ул. Мира 25, 2 этаж. Маникюр с покрытием 1800, без покрытия 900, педикюр 2200, снятие 300. Работаю пн–сб с 9 до 20. Запись в телеграм @lapki_tlt или по телефону 8 937 111-22-33",
    "output": "---\nname: Студия маникюра «Лапки»\ntitle: Профессиональный маникюр и педикюр в Тольятти\ntheme: glass\nbusiness: nails\nphone: +7 937 111-22-33\naddress: ул. Мира 25, 2 этаж\ncity: Тольятти\ncontacts:\n  telegram: lapki_tlt\n  primary: telegram\n---\n\n## О нас\nСтудия маникюра «Лапки» приглашает вас на профессиональный уход за руками и ногами. Мы находимся в Тольятти по адресу ул. Мира 25, 2 этаж. Предлагаем широкий спектр услуг по уходу за ногтями, включая классический маникюр с покрытием и без, а также качественный педикюр и снятие старого покрытия.\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием\nprice: 1800\n\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Педикюр\nprice: 2200\n\ntitle: Снятие покрытия\nprice: 300\n:::\n\n## Часы работы\n:::hours\nпн–сб: 9:00–20:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "8-photographer-messenger",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Фотограф Мария, Екатеринбург. Снимаю семьи, свадьбы, love story. Час съёмки 4000, свадьба целый день 35000. Выезжаю по городу и области. Портфолио и запись: инстаграм maria_foto_ekb, вотсап +79221234567",
    "output": "---\nname: Фотограф Мария\ntitle: Семейные фотосессии, свадьбы, love story в Екатеринбурге\ntheme: glass\nbusiness: photographer\nphone: +7 922 123-4567\ncity: Екатеринбург\ncontacts:\n  whatsapp: +79221234567\n  instagram: maria_foto_ekb\n  primary: whatsapp\n---\n\n## О нас\nПрофессиональный фотограф Мария предлагает фотосессии семей, пар и свадебное фотографирование в Екатеринбурге и области. Создаю яркие и эмоциональные снимки на память.\n\n## Услуги и цены\n:::services\ntitle: Семейная фотосессия\nprice: 4000\nduration: час\n\ntitle: Свадьба\nprice: 35000\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "9-tutor-district",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Илья, репетитор по физике и информатике. Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок). 1000 за урок 45 мин, ЕГЭ 1300 за 60 мин. Пишите в тг fizika_ilya",
    "output": "---\nname: Репетитор Илья\ntitle: Подготовка к ЕГЭ по физике и информатике\ntheme: minimal\nbusiness: tutor\naddress: Академгородок\ncity: Новосибирск\ncurrency: RUB\ncontacts:\n  telegram: fizika_ilya\n  primary: telegram\n---\n\n## О нас\nРепетитор Илья предлагает подготовку школьников 9–11 классов к экзаменам по физике и информатике. Занятия проходят онлайн или в Академгородке, Новосибирск.\n\n## Услуги и цены\n:::services\ntitle: Подготовка по физике и информатике\nprice: 1000\nduration: 45 мин\n\ntitle: Подготовка к ЕГЭ по физике и информатике\nprice: 1300\nduration: 60 мин\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "10-minimal-input",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Маникюр тольятти",
    "output": "---\nname: Маникюр Тольятти\ntitle: Мастер маникюра в Тольятти\nbusiness: nails\ncity: Тольятти\n---\n\n## О нас\nМастер маникюра предлагает профессиональные услуги в сфере ухода за руками и ногтями в городе Тольятти.\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "11-other-niche",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Автосервис «Гараж», Самара, замена масла 800, шиномонтаж от 1500, звоните 8-846-200-30-40",
    "output": "---\nname: Автосервис «Гараж»\ntitle: Ремонт и обслуживание автомобилей\ntheme: auto\nbusiness: other\nphone: +7 846 200-30-40\naddress: улица и дом — уточнить\ncity: Самара\ncurrency: RUB\ncontacts:\n  primary: phone\n---\n\n## Услуги и цены\n:::services\ntitle: Замена масла\nprice: 800\n\ntitle: Шиномонтаж\nprice: от 1500\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "12-no-punctuation",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 2,
    "description": "барбершоп борода стрижка 1500 борода 800 тг ivan_borodach работаем каждый день 10 20 казань баумана 15",
    "output": "---\nname: Барбершоп «Борода»\ntitle: Стрижки и оформление бороды в Казани\ntheme: auto\naccent: auto\nbusiness: barbershop\naddress: Баумана 15\ncity: Казань\ncontacts:\n  telegram: ivan_borodach\n  primary: telegram\n---\n\n## О нас\nБарбершоп «Борода» предлагает профессиональные стрижки и оформление бороды в Казани. Мы находимся на улице Баумана, 15, и рады видеть вас ежедневно с 10:00 до 20:00.\n\n## Услуги и цены\n:::services\ntitle: Стрижка\nprice: 1500\n\ntitle: Оформление бороды\nprice: 800\n:::\n\n## Часы работы\n:::hours\nежедневно: 10:00–20:00\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "13-english",
    "model": "GigaChat-2-Pro",
    "mode": "markdown",
    "attempt": 1,
    "description": "Coffee shop in Moscow, latte 250, cappuccino 230, open daily 8–22, telegram coffee_msk",
    "output": "---\nname: Coffee shop in Moscow\ntitle: Кофе с утра до вечера в Москве\ntheme: glass\nbusiness: other\nphone: \naddress: \ncity: Москва\ncurrency: RUB\ncontacts:\n  telegram: coffee_msk\n  primary: telegram\n---\n\n## О нас\nДобро пожаловать в наш кофейный рай в самом сердце Москвы! Мы предлагаем уютную атмосферу и ароматные напитки, чтобы каждое утро начиналось с правильного вкуса.\n\n## Меню\n:::services\ntitle: Latte\nprice: 250\n\ntitle: Cappuccino\nprice: 230\n:::\n\n## Часы работы\n:::hours\nежедневно: 8–22\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "1-barbershop",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "output": "{\n  \"name\": \"Барбершоп «Топор»\",\n  \"title\": \"Мужские стрижки и уход за бородой в Казани\",\n  \"theme\": \"minimal\",\n  \"business\": \"barbershop\",\n  \"phone\": \"+7 917 555-12-34\",\n  \"address\": \"ул. Садовая, 5\",\n  \"city\": \"Казань\",\n  \"contacts\": {\n    \"telegram\": \"topor_kzn\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Наши услуги\",\n      \"items\": [\n        {\n          \"title\": \"Мужская стрижка\",\n          \"price\": \"1200\"\n        },\n        {\n          \"title\": \"Стрижка бороды\",\n          \"price\": \"700\"\n        },\n        {\n          \"title\": \"Детская стрижка\",\n          \"price\": \"900\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Режим работы\",\n      \"lines\": [\n        \"пн–сб: 10:00–21:00\",\n        \"вс: выходной\"\n      ]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "2-tutor-online",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "output": "{\n  \"name\": \"Анна Сергеевна\",\n  \"title\": \"Репетитор по математике, подготовка к ОГЭ и ЕГЭ\",\n  \"business\": \"tutor\",\n  \"contacts\": {\n    \"whatsapp\": \"+7 903 111-22-33\",\n    \"primary\": \"whatsapp\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О репетиторе\",\n      \"content\": \"Индивидуальные занятия по математике для подготовки к экзаменам ОГЭ и ЕГЭ проводит репетитор Анна Сергеевна. Все уроки проходят онлайн в удобной платформе Zoom.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и стоимость\",\n      \"items\": [\n        {\n          \"title\": \"Урок математики\",\n          \"price\": \"1500\",\n          \"duration\": \"60 минут\",\n          \"description\": \"Оплата производится за одно занятие продолжительностью 60 минут.\"\n        },\n        {\n          \"title\": \"Первое пробное занятие\",\n          \"price\": \"бесплатно\"\n        }\n      ]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Связаться с репетитором\"\n    }\n  ]\n}"
  },
  {
    "id": "3-nails",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "output": "{\n  \"name\": \"Ольга\",\n  \"title\": \"Мастер маникюра в Екатеринбурге\",\n  \"theme\": \"minimal\",\n  \"business\": \"nails\",\n  \"phone\": \"+7 912 345-67-89\",\n  \"address\": \"ул. Малышева, 31, кабинет 12\",\n  \"city\": \"Екатеринбург\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"instagram\": \"olga.nails.ekb\",\n    \"primary\": \"instagram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр с покрытием гель-лак\",\n          \"price\": \"1800\"\n        },\n        {\n          \"title\": \"Снятие покрытия\",\n          \"price\": \"300\"\n        },\n        {\n          \"title\": \"Дизайн ногтей\",\n          \"price\": \"от 100 за ноготь\"\n        }\n      ]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "4-photographer",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "output": "{\n  \"name\": \"Дмитрий\",\n  \"title\": \"Профессиональный фотограф в Санкт-Петербурге\",\n  \"theme\": \"minimal\",\n  \"business\": \"photographer\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"dmitry_photo_spb\",\n    \"email\": \"dmitry.photo@example.ru\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О фотографе\",\n      \"content\": \"Опытный фотограф Дмитрий предлагает качественные свадебные и семейные фотосессии в Санкт-Петербурге. Провожу съёмку на территории клиента.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и стоимость\",\n      \"items\": [\n        {\n          \"title\": \"Семейная фотосессия\",\n          \"price\": \"5000\",\n          \"description\": \"Стоимость часа семейной фотосессии.\"\n        },\n        {\n          \"title\": \"Свадьба\",\n          \"price\": \"от 40 000\",\n          \"description\": \"Фотосъёмка свадьбы на весь день.\"\n        }\n      ]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Связаться с фотографом\"\n    }\n  ]\n}"
  },
  {
    "id": "5-dirty",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-912-777-33-21",
    "output": "{\n  \"name\": \"Иван Барбер\",\n  \"title\": \"Стрижки для мужчин и парней в районе Химмаш, Екатеринбург\",\n  \"theme\": \"minimal\",\n  \"business\": \"barbershop\",\n  \"phone\": \"+7 912 777-33-21\",\n  \"address\": \"Химмаш\",\n  \"city\": \"Екатеринбург\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"ivan_barber\",\n    \"whatsapp\": \"+7 912 777-33-21\",\n    \"primary\": \"whatsapp\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Стрижка\",\n          \"price\": \"1500\"\n        },\n        {\n          \"title\": \"Стрижка машинкой\",\n          \"price\": \"800\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"вт–вс: 10:00–20:00\",\n        \"пн: выходной\"\n      ]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "6-no-contacts",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 2,
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "output": "{\n  \"name\": \"Студия маникюра «Лапки»\",\n  \"title\": \"Маникюр и педикюр в Самаре\",\n  \"theme\": \"minimal\",\n  \"business\": \"nails\",\n  \"address\": \"ул. Ленинградская, 40\",\n  \"city\": \"Самара\",\n  \"currency\": \"RUB\",\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Наши услуги\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр без покрытия\",\n          \"price\": \"900\"\n        },\n        {\n          \"title\": \"Маникюр с покрытием\",\n          \"price\": \"1600\"\n        },\n        {\n          \"title\": \"Педикюр\",\n          \"price\": \"2200\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"График работы\",\n      \"lines\": [\"ежедневно: 9:00–21:00\"]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "7-nails-floor",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Тольятти, ул. Мира 25, 2 этаж. Маникюр с покрытием 1800, без покрытия 900, педикюр 2200, снятие 300. Работаю пн–сб с 9 до 20. Запись в телеграм @lapki_tlt или по телефону 8 937 111-22-33",
    "output": "{\n  \"name\": \"Студия маникюра «Лапки»\",\n  \"title\": \"Маникюр и педикюр в Тольятти\",\n  \"theme\": \"minimal\",\n  \"business\": \"nails\",\n  \"phone\": \"+7 937 111-22-33\",\n  \"address\": \"ул. Мира 25, 2 этаж\",\n  \"city\": \"Тольятти\",\n  \"contacts\": {\n    \"telegram\": \"lapki_tlt\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр с покрытием\",\n          \"price\": \"1800\"\n        },\n        {\n          \"title\": \"Маникюр без покрытия\",\n          \"price\": \"900\"\n        },\n        {\n          \"title\": \"Педикюр\",\n          \"price\": \"2200\"\n        },\n        {\n          \"title\": \"Снятие\",\n          \"price\": \"300\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"График работы\",\n      \"lines\": [\n        \"пн–сб: 9:00–20:00\",\n        \"вс: выходной\"\n      ]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "8-photographer-messenger",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Фотограф Мария, Екатеринбург. Снимаю семьи, свадьбы, love story. Час съёмки 4000, свадьба целый день 35000. Выезжаю по городу и области. Портфолио и запись: инстаграм maria_foto_ekb, вотсап +79221234567",
    "output": "{\n  \"name\": \"Фотограф Мария\",\n  \"title\": \"Семейные фотосессии, свадьбы, love story в Екатеринбурге\",\n  \"theme\": \"minimal\",\n  \"business\": \"photographer\",\n  \"phone\": \"+7 922 123-45-67\",\n  \"city\": \"Екатеринбург\",\n  \"contacts\": {\n    \"whatsapp\": \"+7 922 123-45-67\",\n    \"instagram\": \"maria_foto_ekb\",\n    \"primary\": \"whatsapp\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Семейная фотосессия\",\n          \"price\": \"4000\"\n        },\n        {\n          \"title\": \"Свадьба\",\n          \"price\": \"35000\"\n        },\n        {\n          \"title\": \"Love Story\",\n          \"price\": \"4000\"\n        }\n      ]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "9-tutor-district",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Илья, репетитор по физике и информатике. Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок). 1000 за урок 45 мин, ЕГЭ 1300 за 60 мин. Пишите в тг fizika_ilya",
    "output": "{\n  \"name\": \"Репетитор Илья\",\n  \"title\": \"Подготовка к ЕГЭ по физике и информатике\",\n  \"theme\": \"minimal\",\n  \"business\": \"tutor\",\n  \"contacts\": {\n    \"telegram\": \"fizika_ilya\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О преподавателе\",\n      \"content\": \"Илья проводит занятия по физике и информатике для учеников 9–11 классов. Помогает подготовиться к экзаменам ЕГЭ. Уроки проходят онлайн или в Академгородке, Новосибирск.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и стоимость\",\n      \"items\": [\n        {\n          \"title\": \"Занятия по физике и информатике\",\n          \"price\": \"1000\",\n          \"duration\": \"45 минут\"\n        },\n        {\n          \"title\": \"Подготовка к ЕГЭ\",\n          \"price\": \"1300\",\n          \"duration\": \"60 минут\"\n        }\n      ]\n    }\n  ]\n}"
  },
  {
    "id": "10-minimal-input",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Маникюр тольятти",
    "output": "{\n  \"name\": \"Маникюр Тольятти\",\n  \"title\": \"Профессиональный маникюр в Тольятти\",\n  \"business\": \"nails\",\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Предлагаю качественные услуги маникюра в Тольятти. Создаю красивые и ухоженные руки для моих клиентов.\"\n    }\n  ]\n}"
  },
  {
    "id": "11-other-niche",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Автосервис «Гараж», Самара, замена масла 800, шиномонтаж от 1500, звоните 8-846-200-30-40",
    "output": "{\n  \"name\": \"Автосервис «Гараж»\",\n  \"title\": \"Профессиональный автосервис в Самаре\",\n  \"theme\": \"auto\",\n  \"business\": \"other\",\n  \"phone\": \"+7 846 200-30-40\",\n  \"address\": \"\",\n  \"city\": \"Самара\",\n  \"currency\": \"RUB\",\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Основные услуги\",\n      \"items\": [\n        {\n          \"title\": \"Замена масла\",\n          \"price\": \"800\"\n        },\n        {\n          \"title\": \"Шиномонтаж\",\n          \"price\": \"от 1500\"\n        }\n      ]\n    }\n  ]\n}"
  },
  {
    "id": "12-no-punctuation",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 2,
    "description": "барбершоп борода стрижка 1500 борода 800 тг ivan_borodach работаем каждый день 10 20 казань баумана 15",
    "output": "{\n  \"name\": \"Барбершоп «Борода»\",\n  \"title\": \"Стрижка — 1500, борода — 800 тг.\",\n  \"theme\": \"noir\",\n  \"business\": \"barbershop\",\n  \"address\": \"Баумана 15\",\n  \"city\": \"Казань\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"ivan_borodach\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Стрижка\",\n          \"price\": \"1500\"\n        },\n        {\n          \"title\": \"Борода\",\n          \"price\": \"800\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"каждый день: 10:00–20:00\"\n      ]\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "13-english",
    "model": "GigaChat-2-Pro",
    "mode": "json",
    "attempt": 1,
    "description": "Coffee shop in Moscow, latte 250, cappuccino 230, open daily 8–22, telegram coffee_msk",
    "output": "{\n  \"name\": \"Coffee shop in Moscow\",\n  \"title\": \"Кофейня в Москве с латте за 250 и капучино за 230 рублей.\",\n  \"business\": \"other\",\n  \"theme\": \"minimal\",\n  \"phone\": \"\",\n  \"address\": \"\",\n  \"city\": \"Москва\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"coffee_msk\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"services\",\n      \"title\": \"Меню кофейни\",\n      \"items\": [\n        {\n          \"title\": \"Латте\",\n          \"price\": \"250\"\n        },\n        {\n          \"title\": \"Капучино\",\n          \"price\": \"230\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Режим работы\",\n      \"lines\": [\n        \"ежедневно 8–22\"\n      ]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Связаться\"\n    }\n  ]\n}"
  },
  {
    "id": "1-barbershop",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 2,
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "output": "---\nname: Барбершоп «Топор»\ntitle: Мужские и детские стрижки, уход за бородой\ntheme: glass\nbusiness: barbershop\nphone: +7 917 555-12-34\naddress: ул. Садовая, 5\ncity: Казань\ncurrency: RUB\ncontacts:\n  telegram: topor_kzn\n  whatsapp: +7 917 555-12-34\n---\n\n## О нас\nБарбершоп «Топор» на ул. Садовой, 5 в Казани. Делаем мужские и детские стрижки, ухаживаем за бородой.\n\n## Услуги и цены\n:::services\ntitle: Мужская стрижка\nprice: 1200\n\ntitle: Стрижка бороды\nprice: 700\n\ntitle: Детская стрижка\nprice: 900\n:::\n\n## Часы работы\n:::hours\nпн–сб: 10:00–21:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Записаться можно по телефону или в Telegram.\n\ntitle: Можно ли привести ребёнка?\ncontent: Да, делаем детские стрижки.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "2-tutor-online",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "output": "---\nname: Репетитор по математике Анна Сергеевна\ntitle: Готовлю к ОГЭ и ЕГЭ, онлайн-занятия 60 минут — 1500 ₽\ntheme: auto\nbusiness: tutor\nphone: +7 903 111-22-33\ncurrency: RUB\ncontacts:\n  whatsapp: +7 903 111-22-33\nprimary: whatsapp\n---\n\n## О нас\nРепетитор по математике Анна Сергеевна проводит занятия только онлайн по Zoom. Готовлю к ОГЭ и ЕГЭ.\n\n## Услуги и цены\n:::services\ntitle: Пробное занятие\nprice: бесплатно\ndescription: Первое пробное занятие\n\ntitle: Онлайн-урок (60 мин)\nprice: 1500\nduration: 60 мин\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как проходит обучение?\ncontent: Занятия проходят онлайн по Zoom. Продолжительность урока — 60 минут.\n\ntitle: Что нужно для занятий?\ncontent: Компьютер или смартфон с доступом в интернет, камера и микрофон.\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "3-nails",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "output": "---\nname: Мастер маникюра Ольга\ntitle: Маникюр с покрытием гель-лак, снятие и дизайн ногтей в Екатеринбурге\ntheme: auto\nbusiness: nails\nphone: +7 912 345-67-89\naddress: ул. Малышева, 31, кабинет 12\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  instagram: olga.nails.ekb\n  primary: instagram\n  whatsapp: +7 912 345-67-89\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием гель-лак\nprice: 1800\ndescription: из описания\ntitle: Снятие\nprice: 300\ndescription: из описания\ntitle: Дизайн — от 100 ₽ за ноготь\nprice: от 100\nduration: —\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Запись через Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "4-photographer",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "output": "---\nname: Фотограф Дмитрий\ntitle: Свадебный и семейный фотограф в Санкт-Петербурге, выезд к клиенту\ntheme: auto\nbusiness: photographer\nphone:\naddress: \ncity: Санкт-Петербург\ncurrency: RUB\ncontacts:\n  telegram: dmitry_photo_spb\n  email: dmitry.photo@example.ru\nprimary: telegram\navatar: https://example.ru/avatar.png\n\n## О нас\nФотограф из Санкт-Петербурга. Снимаю свадьбы и семейные фотосессии, работаю на выезде.\n\n## Услуги и цены\n:::services\ntitle: Час съёмки\nprice: 5000\ndescription: Из описания\n\ntitle: Свадьба (целый день)\nprice: от 40000\n:::\n\n## Вопросы\n:::accordion\ntitle: Как проходит съёмка?\ncontent: Из описания\n\ntitle: Что входит в стоимость часа?\ncontent: Из описания\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "5-dirty",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-912-777-33-21",
    "output": "---\nname: Барбер Иван\ntitle: Стригу мужиков и пацанов, район Химмаш, Екатеринбург\ntheme: auto\nbusiness: barbershop\nphone: +7 912-777-33-21\ncity: Екатеринбург\ncontacts:\n  telegram: ivan_barber\n  whatsapp: +7 912-777-33-21\nprimary: telegram\ncurrency: RUB\n\n## Услуги и цены\n:::services\ntitle: Полная стрижка машинкой — 800 ₽\nprice: 800\ndescription: Стрижка машинкой\n\ntitle: Полная стрижка — 1500 ₽\nprice: 1500\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nвс: выходной\nсб: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Пишите в Telegram @ivan_barber или WhatsApp 8-912-777-33-21\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "6-no-contacts",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 2,
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "output": "---\nname: Студия маникюра «Лапки»\ntitle: Маникюр и педикюр в Самаре\ntheme: auto\nbusiness: nails\naddress: ул. Ленинградская, 40\ncity: Самара\ncurrency: RUB\n---\n\n## О нас\nСтудия маникюра «Лапки» — делаем маникюр без покрытия за 900 ₽ и с покрытием за 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.\n\n## Услуги и цены\n:::services\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Маникюр с покрытием\nprice: 1600\n\ntitle: Педикюр\nprice: 2200\n:::\n\n## Часы работы\n:::hours\nежедневно: 9:00–21:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Записаться можно через Telegram или по телефону.\n\ntitle: Можно ли прийти без записи?\ncontent: Да, но лучше заранее сообщить о визите.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "7-nails-floor",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Тольятти, ул. Мира 25, 2 этаж. Маникюр с покрытием 1800, без покрытия 900, педикюр 2200, снятие 300. Работаю пн–сб с 9 до 20. Запись в телеграм @lapki_tlt или по телефону 8 937 111-22-33",
    "output": "---\nname: Студия маникюра «Лапки»\ntitle: Мастер маникюра в Тольятти\ntheme: glass\nbusiness: nails\nphone: +7 937 111-22-33\naddress: ул. Мира 25, 2 этаж\ncity: Тольятти\ncurrency: RUB\ncontacts:\n  telegram: lapki_tlt\n  primary: telegram\n  whatsapp: +7 937 111-22-33\n---\n\n## О нас\nСтудия маникюра «Лапки» — мастер маникюра в Тольятти по адресу ул. Мира 25, 2 этаж.\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием — из описания\nprice: 1800\ntitle: Маникюр без покрытия — из описания\nprice: 900\ntitle: Педикюр — из описания\nprice: 2200\ntitle: Снятие — из описания\nprice: 300\n:::\n\n## Часы работы\n:::hours\nпн–сб: 9:00–20:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться? — из описания\ncontent: Запись через Telegram @lapki_tlt или по телефону 8 937 111-22-33\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "8-photographer-messenger",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Фотограф Мария, Екатеринбург. Снимаю семьи, свадьбы, love story. Час съёмки 4000, свадьба целый день 35000. Выезжаю по городу и области. Портфолио и запись: инстаграм maria_foto_ekb, вотсап +79221234567",
    "output": "---\nname: Фотограф Мария\ntitle: Снимаю семьи, свадьбы, love story. Выезжаю по городу и области.\ntheme: auto\nbusiness: photographer\nphone: +7 922 123-45-67\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  instagram: maria_foto_ekb\n  whatsapp: +7 922 123-45-67\nprimary: instagram\n\n## О нас\nФотограф из Екатеринбурга — снимаю семьи, свадьбы, love story. Работаю на выезд по городу и области.\n\n## Услуги и цены\n:::services\ntitle: Час съёмки\nprice: 4000\ndescription: Из описания\n\ntitle: Свадьба целый день\nprice: 35000\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Запись через инстаграм или вотсап\n:::\n\n## Портфолио\n:::cards\ntitle: Портфолио\nicon: globe\nurl: https://instagram.com/maria_foto_ekb\ntags: портфолио\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "9-tutor-district",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Илья, репетитор по физике и информатике. Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок). 1000 за урок 45 мин, ЕГЭ 1300 за 60 мин. Пишите в тг fizika_ilya",
    "output": "---\nname: Илья, репетитор по физике и информатике\ntitle: Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок)\ntheme: auto\nbusiness: tutor\nphone:\ncurrency: RUB\ncontacts:\n  telegram: fizika_ilya\nprimary: telegram\n---\n\n## О нас\nИлья — репетитор по физике и информатике. Готовлю к ЕГЭ для учеников 9–11 классов. Занятия проходят онлайн или у меня дома в Академгородке Новосибирска.\n\n## Услуги и цены\n:::services\ntitle: Репетиторство по физике/информатике\nprice: 1000\nduration: 45 мин\n\ntitle: Подготовка к ЕГЭ\nprice: 1300\nduration: 60 мин\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: выходной\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как проходит занятие?\ncontent: Индивидуальный подход, разбор теории и задач, подготовка к экзамену.\n\ntitle: Можно ли заниматься онлайн?\ncontent: Да, занятия доступны из любой точки мира.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "10-minimal-input",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Маникюр тольятти",
    "output": "---\nname: Маникюр тольятти\ntitle: Мастер маникюра в Тольятти\ntheme: auto\nbusiness: nails\nphone: +7 900 000-00-00\naddress: улица и дом — из описания\ncity: Тольятти\ncurrency: RUB\ncontacts:\n  primary: telegram\n  telegram: manikyur_tlt\n  whatsapp: +7 900 000-00-00\n---\n\n## О нас\nМастер маникюра в Тольятти. Работаю с ногтями, делаю аккуратный маникюр на любой вкус.\n\n## Услуги и цены\n:::services\ntitle: Маникюр\nprice: от 800\ndescription: Классический, аппаратный, комбинированный маникюр\n\ntitle: Покрытие гель-лак\nprice: 1200\nduration: 60 мин\ndescription: Дизайн по желанию\n\ntitle: Коррекция формы ногтей\nprice: 500\n:::\n\n## Часы работы\n:::hours\nпн–пт: 10:00–20:00\nсб: 11:00–18:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Как записаться?\ncontent: Записаться можно через Telegram или WhatsApp.\n\ntitle: Можно ли принести свой дизайн?\ncontent: Да, если есть готовый рисунок — приносите, сделаем.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "11-other-niche",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Автосервис «Гараж», Самара, замена масла 800, шиномонтаж от 1500, звоните 8-846-200-30-40",
    "output": "---\nname: Автосервис «Гараж»\ntitle: Ремонт и обслуживание автомобилей\ntheme: auto\nbusiness: other\nphone: +7 846-200-30-40\ncity: Самара\ncurrency: RUB\ncontacts:\n  primary: phone\n---\n\n## О нас\nАвтосервис в Самаре. Делаем замену масла, шиномонтаж и другое.\n\n## Услуги и цены\n:::services\ntitle: Замена масла\nprice: 800\ndescription: Из описания\n\ntitle: Шиномонтаж от 1500\nprice: от 1500\n:::\n\n## Часы работы\n:::hours\nпн–пт: 9:00–20:00\nсб: 10:00–18:00\nвс: выходной\n:::\n\n## Вопросы\n:::accordion\ntitle: Часто задаваемые вопросы — из описания\ncontent: Ответ на вопрос 1 — из описания\n\ntitle: Как записаться? — из описания\ncontent: Записаться можно по телефону или через мессенджеры\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "12-no-punctuation",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "барбершоп борода стрижка 1500 борода 800 тг ivan_borodach работаем каждый день 10 20 казань баумана 15",
    "output": "---\nname: Барбершоп «Борода»\ntitle: Стрижки и уход за бородой\ntheme: auto\nbusiness: barbershop\nphone: +7 900 000-00-00\naddress: улица и дом — из описания\ncity: Казань\ncurrency: KZT\ncontacts:\n  telegram: ivan_borodach\n  whatsapp: +7 900 000-00-00\nprimary: telegram\n\n## О нас\nБарбершоп «Борода» — место, где делают мужские стрижки и ухаживают за бородой. Работаем каждый день с 10 до 20 по адресу: Казань, улица Баумана, дом 15.\n\n## Услуги и цены\n:::services\ntitle: Стрижка — 1500 тг\nprice: 1500\ndescription: Мужская стрижка\n\ntitle: Борода — 800 тг\nprice: 800\n:::\n\n## Часы работы\n:::hours\nежедневно: 10:00–20:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Где вы находитесь?\ncontent: Казань, улица Баумана, дом 15.\n\ntitle: Когда работаете?\ncontent: Каждый день с 10 до 20.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "13-english",
    "model": "GigaChat-3-Lightning",
    "mode": "markdown",
    "attempt": 1,
    "description": "Coffee shop in Moscow, latte 250, cappuccino 230, open daily 8–22, telegram coffee_msk",
    "output": "---\nname: Coffee shop in Moscow\ntitle: Кофе и выпечка в центре Москвы, открытая веранда\ntheme: glass\nbusiness: other\nphone:\naddress: улица и дом — из описания\ncity: Москва\ncurrency: RUB\ncontacts:\n  telegram: coffee_msk\nprimary: telegram\n\n## О нас\nКофейня с кофе и выпечкой на открытой веранде. Работаем ежедневно с 8 до 22.\n\n## Услуги и цены\n:::services\ntitle: Латте\nprice: 250\ntitle: Капучино\nprice: 230\n:::\n\n## Часы работы\n:::hours\nежедневно: 8:00–22:00\n:::\n\n## Вопросы\n:::accordion\ntitle: Часто задаваемые вопросы\ncontent: В кофейне есть Wi-Fi, парковка у дома не требуется, работаем без выходных.\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::"
  },
  {
    "id": "1-barbershop",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "output": "{\n  \"name\": \"Барбершоп «Топор»\",\n  \"title\": \"Стрижем мужчин в Казани: мужская стрижка, бороды, детские стрижки.\",\n  \"theme\": \"noir\",\n  \"business\": \"barbershop\",\n  \"phone\": \"+7 917 555-12-34\",\n  \"address\": \"ул. Садовая, 5\",\n  \"city\": \"Казань\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"topor_kzn\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Барбершоп «Топор» — место для мужских стрижек и ухода за бородой в центре Казани на ул. Садовой, 5.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Мужская стрижка\",\n          \"price\": \"1200\"\n        },\n        {\n          \"title\": \"Стрижка бороды\",\n          \"price\": \"700\"\n        },\n        {\n          \"title\": \"Детская стрижка\",\n          \"price\": \"900\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"пн–сб: 10:00–21:00\",\n        \"вс: выходной\"\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "2-tutor-online",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "output": "{\n  \"name\": \"Репетитор по математике Анна Сергеевна\",\n  \"title\": \"Подготовка к ОГЭ и ЕГЭ онлайн, Zoom\",\n  \"theme\": \"glass\",\n  \"business\": \"tutor\",\n  \"phone\": \"+7 903 111-22-33\",\n  \"address\": \"\",\n  \"city\": \"\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"whatsapp\": \"+7 903 111-22-33\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Репетитор по математике Анна Сергеевна. Готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги\",\n      \"items\": [\n        {\n          \"title\": \"Урок (60 минут)\",\n          \"price\": \"1500\"\n        }\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\"по договоренности\"]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "3-nails",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "output": "{\n  \"name\": \"Мастер маникюра Ольга\",\n  \"title\": \"Маникюр и дизайн ногтей в Екатеринбурге\",\n  \"theme\": \"glass\",\n  \"business\": \"nails\",\n  \"address\": \"ул. Малышева, 31, кабинет 12\",\n  \"city\": \"Екатеринбург\",\n  \"currency\": \"RUB\",\n  \"phone\": \"+7 912 345-67-89\",\n  \"contacts\": {\n    \"telegram\": \"olga.nails.ekb\",\n    \"whatsapp\": \"+7 912 345-67-89\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Мастер маникюра Ольга работает в Екатеринбурге по адресу ул. Малышева, 31, кабинет 12. Выполняю маникюр с покрытием гель-лак, снятие и дизайн ногтей.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр с покрытием гель-лак\",\n          \"price\": \"1800\"\n        },\n        {\n          \"title\": \"Снятие\",\n          \"price\": \"300\"\n        },\n        {\n          \"title\": \"Дизайн ногтей — от 100 ₽ за ноготь\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\"пн–пт: 10:00–20:00\", \"сб: 11:00–18:00\", \"вс: выходной\"]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "4-photographer",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "output": "{\n  \"name\": \"Фотограф Дмитрий\",\n  \"title\": \"Свадебный и семейный фотограф в Санкт-Петербурге, выезд к клиенту\",\n  \"theme\": \"glass\",\n  \"business\": \"photographer\",\n  \"city\": \"Санкт-Петербург\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"dmitry_photo_spb\",\n    \"email\": \"dmitry.photo@example.ru\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Фотограф Дмитрий. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги\",\n      \"items\": [\n        {\n          \"title\": \"Час съёмки\",\n          \"price\": \"5000\"\n        },\n        {\n          \"title\": \"Свадьба на целый день\",\n          \"price\": \"от 40000\"\n        }\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "5-dirty",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-912-777-33-21",
    "output": "{\n  \"name\": \"Барбершоп «Иван»\",\n  \"title\": \"Стригу мужиков и пацанов, район Химмаш, Екатеринбург\",\n  \"theme\": \"noir\",\n  \"business\": \"barbershop\",\n  \"phone\": \"+7 912-777-33-21\",\n  \"address\": \"\",\n  \"city\": \"Екатеринбург\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"ivan_barber\",\n    \"whatsapp\": \"+7 912-777-33-21\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Стригут мужиков и пацанов в районе Химмаш, Екатеринбург. Стрижка — 1500р, машинкой — 800р.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Стрижка\",\n          \"price\": \"1500\"\n        },\n        {\n          \"title\": \"Стрижка машинкой\",\n          \"price\": \"800\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"с 10:00 до 20:00, кроме понедельника\"\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "6-no-contacts",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "output": "{\n  \"name\": \"Студия маникюра «Лапки»\",\n  \"title\": \"Маникюр и педикюр в Самаре, ул. Ленинградская, 40\",\n  \"theme\": \"glass\",\n  \"business\": \"nails\",\n  \"address\": \"ул. Ленинградская, 40\",\n  \"city\": \"Самара\",\n  \"currency\": \"RUB\",\n  \"phone\": \"+7 900 000-00-00\",\n  \"contacts\": {\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Студия маникюра «Лапки» — делаем маникюр и педикюр в Самаре по адресу: ул. Ленинградская, 40.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр без покрытия\",\n          \"price\": \"900\"\n        },\n        {\n          \"title\": \"Маникюр с покрытием\",\n          \"price\": \"1600\"\n        },\n        {\n          \"title\": \"Педикюр\",\n          \"price\": \"2200\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"ежедневно: 9:00–21:00\"\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "7-nails-floor",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Студия маникюра «Лапки» в Тольятти, ул. Мира 25, 2 этаж. Маникюр с покрытием 1800, без покрытия 900, педикюр 2200, снятие 300. Работаю пн–сб с 9 до 20. Запись в телеграм @lapki_tlt или по телефону 8 937 111-22-33",
    "output": "{\n  \"name\": \"Студия маникюра «Лапки»\",\n  \"title\": \"Мастер маникюра в Тольятти, ул. Мира 25, 2 этаж\",\n  \"theme\": \"glass\",\n  \"business\": \"nails\",\n  \"address\": \"ул. Мира 25, 2 этаж\",\n  \"city\": \"Тольятти\",\n  \"phone\": \"+7 937 111-22-33\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"lapki_tlt\",\n    \"whatsapp\": \"+7 937 111-22-33\",\n    \"primary\": \"telegram\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Студия маникюра «Лапки» находится в Тольятти на улице Мира 25, второй этаж. Здесь делаю маникюр и педикюр.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Маникюр с покрытием\",\n          \"price\": \"1800\"\n        },\n        {\n          \"title\": \"Маникюр без покрытия\",\n          \"price\": \"900\"\n        },\n        {\n          \"title\": \"Педикюр\",\n          \"price\": \"2200\"\n        },\n        {\n          \"title\": \"Снятие\",\n          \"price\": \"300\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\"пн–сб: 9:00–20:00\"]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "8-photographer-messenger",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Фотограф Мария, Екатеринбург. Снимаю семьи, свадьбы, love story. Час съёмки 4000, свадьба целый день 35000. Выезжаю по городу и области. Портфолио и запись: инстаграм maria_foto_ekb, вотсап +79221234567",
    "output": "{\n  \"name\": \"Фотограф Мария\",\n  \"title\": \"Семейные, свадебные и love story фотосессии в Екатеринбурге и области\",\n  \"theme\": \"glass\",\n  \"business\": \"photographer\",\n  \"avatar\": \"\",\n  \"links\": [],\n  \"phone\": \"+7 922 123-45-67\",\n  \"address\": \"\",\n  \"city\": \"Екатеринбург\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"maria_foto_ekb\",\n    \"whatsapp\": \"+7 922 123-45-67\",\n    \"primary\": \"whatsapp\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Мария — фотограф из Екатеринбурга. Снимаю семьи, свадьбы, love story. Выезжаю по городу и области.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги\",\n      \"items\": [\n        {\n          \"title\": \"Час съёмки\",\n          \"price\": \"4000\"\n        },\n        {\n          \"title\": \"Свадьба (целый день)\",\n          \"price\": \"35000\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Как добраться\",\n      \"lines\": []\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\",\n      \"address\": \"\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "9-tutor-district",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Илья, репетитор по физике и информатике. Подготовка к ЕГЭ, 9–11 класс. Онлайн или у меня дома в Новосибирске (Академгородок). 1000 за урок 45 мин, ЕГЭ 1300 за 60 мин. Пишите в тг fizika_ilya",
    "output": "{\n  \"name\": \"Илья, репетитор по физике и информатике\",\n  \"title\": \"Подготовка к ЕГЭ, физика и информатика для 9–11 классов. Онлайн или у меня дома в Новосибирске (Академгородок)\",\n  \"theme\": \"minimal\",\n  \"business\": \"tutor\",\n  \"phone\": \"+7 900 000-00-00\",\n  \"address\": \"\",\n  \"city\": \"Новосибирск\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"telegram\": \"fizika_ilya\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Репетитор Илья помогает ученикам 9–11 классов с подготовкой к ЕГЭ по физике и информатике. Занятия проходят онлайн или у меня дома в Академгородке Новосибирска.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Урок физики/информатики\",\n          \"price\": \"1000\",\n          \"duration\": \"45 мин\"\n        },\n        {\n          \"title\": \"Подготовка к ЕГЭ\",\n          \"price\": \"1300\",\n          \"duration\": \"60 мин\"\n        }\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\"пн–пт: 10:00–20:00\"]\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "10-minimal-input",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Маникюр тольятти",
    "output": "{\n  \"name\": \"Маникюр тольятти\",\n  \"title\": \"Мастер маникюра в Тольятти\",\n  \"theme\": \"glass\",\n  \"business\": \"nails\",\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Текст о бизнесе своими словами, без новых фактов — из описания\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": []\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": []\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "11-other-niche",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Автосервис «Гараж», Самара, замена масла 800, шиномонтаж от 1500, звоните 8-846-200-30-40",
    "output": "{\n  \"name\": \"Автосервис «Гараж»\",\n  \"title\": \"Ремонт и обслуживание автомобилей в Самаре\",\n  \"theme\": \"minimal\",\n  \"business\": \"other\",\n  \"phone\": \"+7 846-200-30-40\",\n  \"address\": \"\",\n  \"city\": \"Самара\",\n  \"currency\": \"RUB\",\n  \"contacts\": {\n    \"primary\": \"phone\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Автосервис «Гараж» — ремонт и обслуживание автомобилей в Самаре.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги\",\n      \"items\": [\n        {\n          \"title\": \"Замена масла\",\n          \"price\": \"800\"\n        },\n        {\n          \"title\": \"Шиномонтаж\",\n          \"price\": \"от 1500\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\"пн–пт: 9:00–20:00\", \"сб, вс: выходной\"]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "12-no-punctuation",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "барбершоп борода стрижка 1500 борода 800 тг ivan_borodach работаем каждый день 10 20 казань баумана 15",
    "output": "{\n  \"name\": \"Барбершоп Борода\",\n  \"title\": \"Стрижка и борода в Казани, ул. Баумана, 15\",\n  \"theme\": \"noir\",\n  \"business\": \"barbershop\",\n  \"address\": \"Казань, улица Баумана, 15\",\n  \"city\": \"Казань\",\n  \"currency\": \"RUB\",\n  \"phone\": \"+7 900 000-00-00\",\n  \"contacts\": {\n    \"telegram\": \"ivan_borodach\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Барбершоп «Борода» — место для стильных стрижек и ухода за бородой. Работаем каждый день с 10:00 до 20:00.\"\n    },\n    {\n      \"type\": \"services\",\n      \"title\": \"Услуги и цены\",\n      \"items\": [\n        {\n          \"title\": \"Стрижка\",\n          \"price\": \"1500\"\n        },\n        {\n          \"title\": \"Борода\",\n          \"price\": \"800\"\n        }\n      ]\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"ежедневно: 10:00–20:00\"\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"map\",\n      \"title\": \"Как добраться\"\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  },
  {
    "id": "13-english",
    "model": "GigaChat-3-Lightning",
    "mode": "json",
    "attempt": 1,
    "description": "Coffee shop in Moscow, latte 250, cappuccino 230, open daily 8–22, telegram coffee_msk",
    "output": "{\n  \"name\": \"Coffee shop in Moscow\",\n  \"title\": \"Кофейня в Москве: кофе и выпечка с утра до вечера\",\n  \"theme\": \"glass\",\n  \"business\": \"other\",\n  \"city\": \"Moscow\",\n  \"contacts\": {\n    \"telegram\": \"coffee_msk\"\n  },\n  \"sections\": [\n    {\n      \"type\": \"text\",\n      \"title\": \"О нас\",\n      \"content\": \"Кофейня в центре города, где можно выпить свежесваренный кофе или взять выпечку на вынос. Работаем ежедневно с 8:00 до 22:00.\"\n    },\n    {\n      \"type\": \"hours\",\n      \"title\": \"Часы работы\",\n      \"lines\": [\n        \"ежедневно: 8:00–22:00\"\n      ]\n    },\n    {\n      \"type\": \"cards\",\n      \"title\": \"Напитки\",\n      \"items\": [\n        {\n          \"title\": \"Латте\",\n          \"description\": \"Капучино\",\n          \"icon\": \"heart\"\n        }\n      ]\n    },\n    {\n      \"type\": \"accordion\",\n      \"title\": \"Вопросы\",\n      \"items\": []\n    },\n    {\n      \"type\": \"contacts\",\n      \"title\": \"Контакты\"\n    }\n  ]\n}"
  }
]
