// Контраст цвета по WCAG 2.1: цвет accent на сайте — это и цвет текста (цены, ссылки, заголовки) на фоне темы.
// Жёлтый #ffd700 на белом даёт 1,4 : 1 — текст не читается; норма для обычного текста — 4,5 : 1.

/** Минимальный контраст обычного текста (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex
  return [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`

/** Относительная яркость по WCAG (с гамма-коррекцией). */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/**
 * Ближайший к цвету оттенок с нужным контрастом на фоне: смешиваем с чёрным (светлый фон) или белым (тёмный),
 * пока контраст не станет достаточным. Оттенок сохраняется, меняется только светлота.
 */
export function readableAccent(color: string, background: string, target = MIN_TEXT_CONTRAST): string {
  if (contrast(color, background) >= target) return toHex(toRgb(color))
  const towards: Rgb = luminance(toRgb(background)) > 0.5 ? [0, 0, 0] : [255, 255, 255]
  const rgb = toRgb(color)
  for (let step = 1; step <= 100; step++) {
    const t = step / 100
    const mixed = rgb.map((c, i) => c + (towards[i] - c) * t) as Rgb
    const hex = toHex(mixed)
    if (contrast(hex, background) >= target) return hex
  }
  return toHex(towards)
}
