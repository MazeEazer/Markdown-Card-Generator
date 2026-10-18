/** Цвет текста на залитой кнопке: тёмный на светлом цвете темы (жёлтый, белый), иначе белый. */
export function readableOn(color: string): string {
  const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)
  if (!hex) return '#ffffff'
  const [r, g, b] = hex.slice(1).map((part) => parseInt(part, 16) / 255)
  // Относительная яркость (упрощённо, как в WCAG без гамма-коррекции)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#111111' : '#ffffff'
}
