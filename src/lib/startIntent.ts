// Кнопка первого экрана, нажатая до входа: после входа сразу открываем нужную форму (ИИ или шаблон).
// Хранится в sessionStorage вкладки; недоступно (приватный режим) — просто не открываем ничего.

export type StartIntent = 'ai' | 'template'

const KEY = 'mdcard:start-intent'

export function saveStartIntent(intent: StartIntent, storage: Pick<Storage, 'setItem'> | null = safeSession()) {
  try {
    storage?.setItem(KEY, intent)
  } catch {
    // хранилище недоступно — после входа пользователь нажмёт кнопку ещё раз
  }
}

/** Прочитать и забыть: форма открывается один раз, а не при каждом возврате к списку. */
export function takeStartIntent(storage: Pick<Storage, 'getItem' | 'removeItem'> | null = safeSession()): StartIntent | null {
  try {
    const value = storage?.getItem(KEY)
    storage?.removeItem(KEY)
    return value === 'ai' || value === 'template' ? value : null
  } catch {
    return null
  }
}

function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
