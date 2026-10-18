// «Возможно, вы имели в виду…»: ближайшее известное слово по расстоянию редактирования.

/**
 * Расстояние Дамерау — Левенштейна (вариант OSA): вставка, удаление, замена символа
 * и перестановка соседних символов стоят по 1. Перестановка — частая опечатка: «titel» → «title».
 */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) rows[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
      }
    }
  }
  return rows[a.length][b.length]
}

/** Сколько опечаток допускаем: в коротких словах любая правка меняет смысл (vk ↔ max). */
function maxDistance(length: number): number {
  if (length <= 2) return 0
  if (length <= 5) return 1
  return 2
}

/**
 * Ближайший кандидат к слову без учёта регистра или null, если похожих нет
 * или два кандидата одинаково близки (подсказка была бы гаданием).
 * `aliases` — привычные сокращения и написания по-русски: { tg: 'telegram' }; учитываются, только если это один из кандидатов.
 */
export function suggest(word: string, candidates: readonly string[], aliases: Record<string, string> = {}): string | null {
  const normalized = word.trim().toLowerCase()
  if (!normalized) return null
  const alias = aliases[normalized]
  if (alias && candidates.includes(alias)) return alias

  let best: string | null = null
  let bestDistance = Infinity
  let tie = false
  for (const candidate of candidates) {
    const distance = editDistance(normalized, candidate.toLowerCase())
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
      tie = false
    } else if (distance === bestDistance) {
      tie = true
    }
  }

  return best !== null && !tie && bestDistance <= maxDistance(normalized.length) ? best : null
}

