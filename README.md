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
theme: auto          # auto | aurora | glass | minimal | noir
accent: auto         # auto — палитра из имени
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

## Темы

| Тема | Стиль |
|------|-------|
| **Aurora** | Градиенты, glassmorphism, мягкие анимации |
| **Glass** | Frosted glass, blur-эффекты |
| **Minimal** | Типографика Playfair + Inter, много воздуха |
| **Noir** | Тёмный фон, neon accent, monospace |

При `theme: auto` тема выбирается по ключевым словам в title и секциях.  
При `accent: auto` цвет генерируется из hash имени — стабильный и уникальный.

## Экспорт

Кнопка **Экспорт HTML** скачивает один `.html` файл со встроенными стилями и шрифтами. Файл работает без сервера.

## Стек

React 18 · Vite · TypeScript · Tailwind CSS · gray-matter · react-markdown
