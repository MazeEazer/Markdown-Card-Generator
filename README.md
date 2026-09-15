# MD Card

Генератор красивых сайтов-визиток из Markdown. Редактор слева, live-превью справа, экспорт в автономный HTML.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # предпросмотр production-сборки
```

## Формат Markdown

```markdown
---
name: Алексей Иванов
title: Frontend-разработчик
theme: auto          # auto | glass | minimal | noir | vercel
accent: auto         # hex-цвет (#ff5500) или auto — палитра из имени
avatar: https://...
location: Москва
links:
  - label: GitHub
    url: https://github.com/user
    icon: github
  - label: Email
    url: mailto:hello@example.com
    icon: mail
---

## О себе
Краткое описание.

## Навыки
React, TypeScript, Node.js

## Опыт
**Senior Developer** — Acme Inc, 2022–2026
Описание достижений.

## Контакты
Напишите на email или в Telegram.
```

## Дополнительные типы секций

Внутри любой секции `## Заголовок` можно использовать специальные блоки — тип определяется автоматически (`detectSectionType`).

### Таблица

Обычная Markdown-таблица: секция распознаётся по строкам с `|` и строке-разделителю из `-`.

```markdown
## Опыт

| Компания | Роль | Период |
|----------|------|--------|
| Acme Inc | Senior Developer | 2022–2026 |
| Startup Lab | Frontend Developer | 2020–2022 |
```

### Аккордеон / FAQ

Блок `:::accordion`, элементы разделяются пустой строкой:

```markdown
## FAQ

:::accordion
title: С какими технологиями вы работаете?
content: React, TypeScript, Node.js

title: Как связаться?
content: Напишите на email или в Telegram
:::
```

### Кодовый блок с подсветкой

Блок `:::code lang="..."`. Подсветка встроенная (без внешних библиотек): `typescript`, `javascript`, `json`, `css`, `html`, `python`, `bash`.

```markdown
## Пример кода

:::code lang="typescript"
const greet = (name: string): string => 'Привет, ' + name
console.log(greet('мир'))
:::
```

### Сетка карточек

Блок `:::cards`, элементы разделяются пустой строкой:

```markdown
## Проекты

:::cards
title: Дизайн-система
description: 36 переиспользуемых компонентов для 12 продуктов компании
icon: star
url: https://github.com/example/design-system
tags: React, Storybook, Tokens

title: Realtime-дашборд
description: Аналитика в реальном времени на WebSocket
icon: rocket
url: https://github.com/example/realtime-dashboard
tags: TypeScript, WebSocket, D3
:::
```

Поля карточки:

| Поле | Описание |
|------|----------|
| `title` | Название проекта |
| `description` | Краткое описание (можно переносить на несколько строк — строки без ключа допишутся к описанию) |
| `icon` | Иконка (см. список ниже) |
| `url` (или `link`) | Ссылка на проект: вся карточка становится кликабельной, под описанием показывается адрес |
| `tags` | Стек/теги через запятую — выводятся чипами |

Доступные иконки: `star`, `rocket`, `code`, `briefcase`, `heart`, `globe`, `user`, `zap`, `github`, `mail`, `telegram`, `link`.  
Открытый блок без закрывающего `:::` считается секцией до конца раздела. Строки `##` внутри блока не считаются заголовками.

### Разделитель без названия

`##` без названия (можно с пробелами после) — граница «куска» внутри текущей секции: содержимое остаётся в этой секции, а на месте `##` появляется тонкая линия-разделитель.

```markdown
## Опыт
**Senior Developer** — Acme Inc, 2022–2026
Описание достижений.

##

**Frontend Developer** — Startup Lab, 2020–2022
Описание.
```

Если `##` стоит до первой именованной секции — содержимое становится безымянным блоком без заголовка (текст до первого `##` тоже больше не теряется).

## Темы

| Тема | Стиль |
|------|-------|
| **Glass** | Frosted glass, blur-эффекты |
| **Minimal** | Типографика Playfair + Inter, много воздуха |
| **Noir** | Тёмный фон, neon accent, monospace |
| **Vercel** | Чёрный фон, тонкие бордеры, Geist / Geist Mono, моно-лейблы |

При `theme: auto` тема выбирается по ключевым словам в title и секциях.  
При `accent: auto` цвет генерируется из hash имени — стабильный и уникальный (можно задать свой hex-цвет, например `accent: "#ff5500"`).  
Тема **Vercel** монохромная: `accent` для неё игнорируется — используются только чёрный, белый и оттенки серого.

## Экспорт

Кнопка **Экспорт HTML** скачивает один `.html` файл со встроенными стилями и шрифтами. Файл работает без сервера.

Кнопка **Экспорт PDF** сохраняет текущее превью как PDF-документ.

## Стек

React 18 · Vite · TypeScript · Tailwind CSS · gray-matter · react-markdown
