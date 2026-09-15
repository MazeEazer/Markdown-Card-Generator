export const defaultTemplate = `---
name: Алексей Иванов
title: Frontend-разработчик
theme: auto
accent: auto
avatar: https://api.dicebear.com/7.x/avataaars/svg?seed=Alexey
location: Москва
links:
  - label: GitHuba
    url: https://github.com
    icon: github
  - label: Email
    url: mailto:hello@example.com
    icon: mail
  - label: Telegram
    url: https://t.me
    icon: telegram
---

## О себе
Создаю быстрые и красивые веб-приложения. Люблю чистый код, продуманный UX и современные технологии.

## Навыки
React, TypeScript, Node.js, Vite, Tailwind CSS, Figma

## Опыт
**Senior Frontend Developer** — Acme Inc, 2022–2026

Разработал дизайн-систему и ускорил загрузку приложения на 40%.

##

**Frontend Developer** — Startup Lab, 2020–2022

Запустил MVP за 3 месяца, привлёк 10 000 пользователей.

## Проекты

:::cards
title: Дизайн-система
description: 36 компонентов для продуктов компании
icon: star
url: https://github.com/example/design-system
tags: React, Storybook, Tokens

title: Realtime-дашборд
description: Аналитика в реальном времени на WebSocket
icon: rocket
url: https://github.com/example/realtime-dashboard
tags: TypeScript, WebSocket, D3
:::

## Технологии

| Технология | Опыт | Уровень |
|------------|------|---------|
| React | 6 лет | Expert |
| TypeScript | 4 года | Advanced |
| Node.js | 3 года | Intermediate |

## Пример кода

:::code lang="typescript"
export function greet(name: string): string {
  // Приветствие пользователя
  return 'Привет, ' + name + '!'
}

console.log(greet('мир'))
:::

## FAQ

:::accordion
title: С какими технологиями вы работаете?
content: React, TypeScript, Node.js и Vite — мой основной стек.

title: Как со мной связаться?
content: Напишите на email или в Telegram — отвечаю в течение дня.
:::

## Контакты
Напишите на email или в Telegram — отвечаю в течение дня.
`
