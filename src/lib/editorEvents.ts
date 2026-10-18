// Журнал событий редактора → таблица editor_events в Supabase. Выключен, пока не включён флагом.
import { createLogger, type EditorLogger, NO_LOGGER } from '../editor/events'
import { supabase } from './supabase'

const STORAGE_KEY = 'md-card:editor-events'

/**
 * Включено ли логирование. Порядок: localStorage (`on` / `off` — включить на одном компьютере для эксперимента,
 * без пересборки), затем переменная сборки VITE_EDITOR_EVENTS=on. По умолчанию — выключено.
 */
export function editorEventsEnabled(): boolean {
  try {
    const local = localStorage.getItem(STORAGE_KEY)
    if (local === 'on') return true
    if (local === 'off') return false
  } catch {
    // localStorage недоступен (приватный режим) — решает переменная сборки
  }
  return import.meta.env.VITE_EDITOR_EVENTS === 'on'
}

/** Журнал для одного открытого редактора: свой session_id, события привязаны к сайту. */
export function createEditorLogger(siteId: string | null): EditorLogger {
  if (!editorEventsEnabled()) return NO_LOGGER
  const sessionId = crypto.randomUUID()
  return createLogger((events) => {
    const rows = events.map((event) => ({ ...event, site_id: siteId, session_id: sessionId }))
    // Ошибка записи не должна мешать работе с редактором — только сообщение в консоли
    void supabase
      .from('editor_events')
      .insert(rows)
      .then(({ error }) => {
        if (error) console.warn('Журнал редактора: не удалось записать события', error.message)
      })
  })
}
