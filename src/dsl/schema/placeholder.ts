// Маркер условного значения в примерах для нейросети: «Вопрос 1 — из описания», «улица и дом — из описания».
// Один на все заглушки: по нему они строятся (prompt.ts, promptExample в схеме) и находятся в ответе (placeholders.ts).
export const PLACEHOLDER_MARKER = 'из описания'

/** Заглушка с маркером: «Вопрос 1» → «Вопрос 1 — из описания». */
export const placeholder = (what: string) => `${what} — ${PLACEHOLDER_MARKER}`
