// Параллакс первого экрана: прокрутка в пикселях, которую CSS умножает на скорость слоя (index.css, .parallax-*).
// Дальше высоты первого экрана не считаем — слои ниже не видны; при «уменьшить движение» — ноль.

export function parallaxOffset(scrollY: number, limit: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  return Math.round(Math.min(Math.max(scrollY, 0), Math.max(limit, 0)))
}
