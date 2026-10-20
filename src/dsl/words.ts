// Слова описания для сравнения с ответом нейросети: нейросеть склоняет («на Садовой» → «ул. Садовая»),
// поэтому сравниваем основы — слово без окончания. Используют проверки по описанию (ground.ts, placeholders.ts).

export const letters = (text: string) => text.toLowerCase().replace(/ё/g, 'е')

/** Основа слова: без окончания — «садовая» и «садовой» дают одну основу. */
export const stem = (word: string) => (word.length > 5 ? word.slice(0, -2) : word.length > 3 ? word.slice(0, -1) : word)

export const wordsOf = (text: string) => letters(text).match(/[a-zа-я]+(?:-[a-zа-я]+)*/g) ?? []

/** Есть ли в тексте слово с той же основой. */
export function stemMatcher(text: string): (word: string) => boolean {
  const words = wordsOf(text).flatMap((w) => [w, ...w.split('-')])
  return (word) => {
    const s = stem(letters(word))
    return words.some((w) => w.startsWith(s) || s.startsWith(stem(w)))
  }
}
