// Стартовые шаблоны сайта по нишам: выбираются при создании сайта.
import { stringify } from 'yaml'
import type { BusinessName } from '../../dsl/schema/frontmatter'
import { barbershop } from './barbershop'
import { nails } from './nails'
import { photographer } from './photographer'
import { tutor } from './tutor'

export interface SiteTemplate {
  id: BusinessName | 'empty'
  label: string
  description: string
  markdown: string
}

const empty = `---
name: Название
title: Чем вы занимаетесь — одной строкой
---

## О нас
Расскажите о себе: чем занимаетесь, сколько лет, чем отличаетесь.
`

export const TEMPLATES: SiteTemplate[] = [
  { id: 'barbershop', label: 'Барбершоп', description: 'Услуги, часы работы, карта, запись в Telegram', markdown: barbershop },
  { id: 'nails', label: 'Маникюр', description: 'Прайс, часы работы, карта, запись в WhatsApp', markdown: nails },
  { id: 'tutor', label: 'Репетитор', description: 'Занятия и цены, расписание, вопросы', markdown: tutor },
  { id: 'photographer', label: 'Фотограф', description: 'Направления, стоимость съёмки, отзывы', markdown: photographer },
  { id: 'empty', label: 'Пустой сайт', description: 'Только название и раздел «О нас»', markdown: empty },
]

/** Шаблон по умолчанию — в редакторе до выбора сайта и по кнопке «Пример». */
export const DEFAULT_TEMPLATE = barbershop

/** Текст шаблона с названием сайта, которое ввёл пользователь (в кавычках YAML, если нужно). */
export function templateMarkdown(id: SiteTemplate['id'], name: string): string {
  const template = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0]
  const title = name.trim()
  if (!title) return template.markdown
  return template.markdown.replace(/^name: .*$/m, stringify({ name: title }, { lineWidth: 0 }).trimEnd())
}
