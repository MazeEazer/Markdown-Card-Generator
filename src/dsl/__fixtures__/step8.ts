// Ответы generate-site из прогона шага 8 (experiments/results/2026-10-20_15-07-07, prompt_version 69e240f7ed35 / b5583940f818):
// итоговые документы как их получил пользователь — до проверки по описанию. Для тестов ground.ts.
export interface Step8Run {
  id: string
  mode: 'markdown' | 'json'
  description: string
  markdown: string
}

export const STEP8_RUNS: Step8Run[] = [
  {
    "id": "1-barbershop",
    "mode": "markdown",
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "markdown": "---\nname: Барбершоп «Топор»\ntitle: Стильные мужские стрижки и уход за бородой\ntheme: minimal\naccent: \"#e74c3c\"\nbusiness: barbershop\nphone: +7 917 555-12-34\naddress: ул. Садовая, 5\ncity: Казань\ncontacts:\n  telegram: topor_kzn\n  primary: telegram\n---\n\n## О нас\nБарбершоп «Топор» предлагает качественные мужские стрижки и профессиональный уход за бородой. Мы находимся в Казани по адресу ул. Садовая, 5 и работаем ежедневно с понедельника по субботу с 10:00 до 21:00.\n\n## Услуги и цены\n:::services\ntitle: Мужская стрижка\nprice: 1200\n\ntitle: Стрижка бороды\nprice: 700\n\ntitle: Детская стрижка\nprice: 900\n:::\n\n## Часы работы\n:::hours\nпн–сб: 10:00–21:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "1-barbershop",
    "mode": "json",
    "description": "Барбершоп «Топор» на ул. Садовой, 5 в Казани. Мужская стрижка — 1200 ₽, стрижка бороды — 700 ₽, детская стрижка — 900 ₽. Работаем пн–сб с 10:00 до 21:00, воскресенье выходной. Телефон +7 917 555-12-34, Telegram topor_kzn.",
    "markdown": "---\nname: Барбершоп «Топор»\ntitle: Мужские стрижки и уход за бородой в Казани\ntheme: minimal\nbusiness: barbershop\nphone: +7 917 555-12-34\naddress: ул. Садовая, 5\ncity: Казань\ncontacts:\n  telegram: topor_kzn\n  primary: telegram\n---\n\n## Наши услуги\n:::services\ntitle: Мужская стрижка\nprice: 1200\n\ntitle: Стрижка бороды\nprice: 700\n\ntitle: Детская стрижка\nprice: 900\n:::\n\n## Режим работы\n:::hours\nпн–сб: 10:00–21:00\nвс: выходной\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "2-tutor-online",
    "mode": "markdown",
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "markdown": "---\nname: Репетитор по математике Анна Сергеевна\ntitle: Готовлю к ОГЭ и ЕГЭ онлайн\ntheme: minimal\naccent: \"#3498db\"\nbusiness: tutor\ncontacts:\n  whatsapp: +7 903 111-22-33\n  primary: whatsapp\n---\n\n## О нас\nАнна Сергеевна проводит занятия по математике онлайн через платформу Zoom. Специализация — подготовка школьников к экзаменам ОГЭ и ЕГЭ.\n\n## Услуги и цены\n:::services\ntitle: Онлайн урок математики\nprice: 1500\nduration: 60 мин\ndescription: Индивидуальное занятие по математике длительностью 60 минут.\n\ntitle: Пробное занятие\nprice: Бесплатно\ndescription: Первое занятие проводится бесплатно для знакомства с преподавателем и учебным процессом.\n:::\n\n## Вопросы\n:::accordion\ntitle: Где проходят занятия?\ncontent: Все уроки проводятся онлайн по Zoom.\n\ntitle: Есть ли бесплатное занятие?\ncontent: Да, предоставляется одно бесплатное пробное занятие.\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "2-tutor-online",
    "mode": "json",
    "description": "Репетитор по математике Анна Сергеевна, готовлю к ОГЭ и ЕГЭ. Занятия только онлайн по Zoom. Урок 60 минут — 1500 ₽, первое пробное занятие бесплатно. Пишите в WhatsApp +7 903 111-22-33.",
    "markdown": "---\nname: Анна Сергеевна\ntitle: Репетитор по математике, подготовка к ОГЭ и ЕГЭ\ntheme: minimal\nbusiness: tutor\ncontacts:\n  whatsapp: +7 903 111-22-33\n  primary: whatsapp\n---\n\n## О репетиторе\nАнна Сергеевна проводит занятия по математике онлайн через платформу Zoom. Помогает ученикам подготовиться к экзаменам ОГЭ и ЕГЭ.\n\n## Услуги и стоимость\n:::services\ntitle: Занятие по математике\nprice: 1500\nduration: 60 минут\ndescription: Индивидуальное занятие по математике онлайн через Zoom.\n\ntitle: Первое пробное занятие\nprice: бесплатно\n:::\n"
  },
  {
    "id": "3-nails",
    "mode": "markdown",
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "markdown": "---\nname: Мастер маникюра Ольга\ntitle: Качественный маникюр с покрытием гель-лак и дизайном\ntheme: minimal\naccent: \"#ffd700\"\navatar: https://example.com/photo.jpg\nbusiness: nails\nphone: +7 912 345-67-89\naddress: ул. Малышева, 31, кабинет 12\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  instagram: olga.nails.ekb\n  primary: instagram\n---\n\n## О нас\nПрофессиональный мастер маникюра Ольга предлагает услуги по уходу за ногтями в Екатеринбурге. В кабинете 12 по адресу ул. Малышева, 31 вы можете сделать маникюр с покрытием гель-лаком, снять старое покрытие или заказать индивидуальный дизайн ногтей.\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием гель-лак\nprice: 1800\n\ntitle: Снятие покрытия\nprice: 300\n\ntitle: Дизайн ногтей\nprice: от 100 за ноготь\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "3-nails",
    "mode": "json",
    "description": "Мастер маникюра Ольга, Екатеринбург, ул. Малышева, 31, кабинет 12. Маникюр с покрытием гель-лак — 1800 ₽, снятие — 300 ₽, дизайн — от 100 ₽ за ноготь. Запись в Instagram olga.nails.ekb или по телефону 8 (912) 345-67-89.",
    "markdown": "---\nname: Ольга\ntitle: Мастер маникюра в Екатеринбурге\ntheme: minimal\nbusiness: nails\nphone: +7 912 345-67-89\naddress: ул. Малышева, 31, кабинет 12\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  instagram: olga.nails.ekb\n  primary: instagram\n---\n\n## Услуги и цены\n:::services\ntitle: Маникюр с покрытием гель-лак\nprice: 1800\n\ntitle: Снятие покрытия\nprice: 300\n\ntitle: Дизайн ногтей\nprice: от 100 за ноготь\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "4-photographer",
    "mode": "markdown",
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "markdown": "---\nname: Фотограф Дмитрий\ntitle: Семейные фотосессии и свадьбы в Санкт-Петербурге\ntheme: minimal\naccent: \"#7ebcd3\"\nbusiness: photographer\ncity: Санкт-Петербург\ncurrency: RUB\ncontacts:\n  telegram: dmitry_photo_spb\n  email: dmitry.photo@example.ru\n  primary: telegram\n---\n\n## О нас\nФотограф Дмитрий предлагает услуги свадебной и семейной фотосъёмки в Санкт-Петербурге. Все съёмки проходят на территории клиента — выезд на место организовывает фотограф.\n\n## Услуги и цены\n:::services\ntitle: Семейная фотосессия\nprice: 5000\nduration: час\n\ntitle: Свадьба\nprice: от 40000\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "4-photographer",
    "mode": "json",
    "description": "Фотограф Дмитрий, Санкт-Петербург. Снимаю свадьбы и семейные фотосессии, выезжаю к клиенту. Час съёмки — 5000 руб., свадьба на целый день — от 40 000 руб. Связь: Telegram @dmitry_photo_spb, почта dmitry.photo@example.ru.",
    "markdown": "---\nname: Дмитрий\ntitle: Фотограф в Санкт-Петербурге\ntheme: minimal\nbusiness: photographer\ncontacts:\n  telegram: dmitry_photo_spb\n  email: dmitry.photo@example.ru\n  primary: telegram\n---\n\n## О фотографе\nПрофессиональный фотограф Дмитрий предлагает услуги свадебной и семейной фотосъёмки в Санкт-Петербурге. Провожу съёмки на выезде, чтобы создать уникальные кадры в удобном для вас месте.\n\n## Услуги и стоимость\n:::services\ntitle: Семейная фотосессия\nprice: 5000\ndescription: Стоимость часа съёмки\n\ntitle: Свадьба\nprice: от 40000\ndescription: Фотосъёмка на весь день\n:::\n\n## Связаться с фотографом\n:::contacts\n:::\n"
  },
  {
    "id": "5-dirty",
    "mode": "markdown",
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-999-123-45-67",
    "markdown": "---\nname: Иван Барбер\ntitle: Стрижки для мужчин и подростков в районе Химмаш, Екатеринбург\ntheme: minimal\naccent: \"#c0392b\"\nbusiness: barbershop\naddress: район Химмаш\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  telegram: ivan_barber\n  whatsapp: +7 999 123-45-67\n  primary: telegram\n---\n\n## О нас\nБарбер Иван предлагает профессиональные стрижки мужчинам и подросткам в районе Химмаш, Екатеринбург. Индивидуальный подход и внимание к деталям помогут создать стильный образ.\n\n## Услуги и цены\n:::services\ntitle: Стрижка ножницами\nprice: 1500\n\ntitle: Стрижка машинкой\nprice: 800\n:::\n\n## Часы работы\n:::hours\nпн: выходной\nвт–вс: 10:00–20:00\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "5-dirty",
    "mode": "json",
    "description": "стригу мужиков и пацанов, район химмаш екб. стрижка 1500р, машинкой 800р. работаю с 10ти до 8ми кроме понедельника. пишите в тг @ivan_barber или ватсап 8-999-123-45-67",
    "markdown": "---\nname: Иван Барбер\ntitle: Стрижки для мужчин и парней в районе Химмаш, Екатеринбург\ntheme: minimal\nbusiness: barbershop\nphone: +7 999 123-45-67\naddress: район Химмаш\ncity: Екатеринбург\ncurrency: RUB\ncontacts:\n  telegram: ivan_barber\n  whatsapp: +7 999 123-45-67\n  primary: telegram\n---\n\n## Услуги и цены\n:::services\ntitle: Стрижка\nprice: 1500\n\ntitle: Стрижка машинкой\nprice: 800\n:::\n\n## Часы работы\n:::hours\nвт–вс: 10:00–20:00\nпн: выходной\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "6-no-contacts",
    "mode": "markdown",
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "markdown": "---\nname: Студия маникюра «Лапки»\ntitle: Профессиональный маникюр и педикюр в Самаре\ntheme: minimal\naccent: \"#ffd700\"\nbusiness: nails\nphone: +7 999 123-45-67\naddress: ул. Ленинградская, 40\ncity: Самара\ncurrency: RUB\ncontacts:\n  whatsapp: +7 999 123-45-67\n  instagram: lapki_nails\n  primary: whatsapp\n---\n\n## О нас\nСтудия маникюра «Лапки» приглашает всех желающих на качественный маникюр и педикюр. Мы находимся в Самаре по адресу ул. Ленинградская, 40 и работаем ежедневно с 9 до 21 часа.\n\n## Наши услуги\n:::services\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Маникюр с покрытием\nprice: 1600\n\ntitle: Педикюр\nprice: 2200\n:::\n\n## Часы работы\n:::hours\nежедневно: 9:00–21:00\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  },
  {
    "id": "6-no-contacts",
    "mode": "json",
    "description": "Студия маникюра «Лапки» в Самаре, ул. Ленинградская, 40. Маникюр без покрытия — 900 ₽, с покрытием — 1600 ₽, педикюр — 2200 ₽. Работаем ежедневно с 9 до 21.",
    "markdown": "---\nname: Студия маникюра «Лапки»\ntitle: Маникюр и педикюр в Самаре\ntheme: minimal\nbusiness: nails\naddress: ул. Ленинградская, 40\ncity: Самара\ncurrency: RUB\n---\n\n## Наши услуги\n:::services\ntitle: Маникюр без покрытия\nprice: 900\n\ntitle: Маникюр с покрытием\nprice: 1600\n\ntitle: Педикюр\nprice: 2200\n:::\n\n## Режим работы\n:::hours\nежедневно: 9:00–21:00\n:::\n\n## Как добраться\n:::map\n:::\n\n## Контакты\n:::contacts\n:::\n"
  }
]
