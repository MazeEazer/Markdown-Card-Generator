// Сжатие фото перед вставкой в avatar: фото с телефона (4000×3000, 3–5 МБ) в base64 раздувает документ до мегабайтов,
// а на сайте аватар показывается кружком в пару сотен точек. Уменьшаем до 512 px по большей стороне и кодируем
// в WebP (где браузер не умеет — в JPEG) с качеством 0,8: получается десятки килобайт. Перекодирование заодно
// убирает EXIF — в нём бывают координаты съёмки, которым не место на публичном сайте.

export const AVATAR_MAX_SIDE = 512
export const AVATAR_QUALITY = 0.8

/** Размер, вписанный в квадрат max×max с сохранением пропорций; маленькие фото не увеличиваем. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

interface Canvas2D {
  getContext(type: '2d'): {
    fillStyle: string | CanvasGradient | CanvasPattern
    fillRect(x: number, y: number, w: number, h: number): void
    drawImage(image: never, dx: number, dy: number, dw: number, dh: number): void
  } | null
  toDataURL(type: string, quality: number): string
}

/** Чем декодировать и рисовать: в браузере — canvas, в тестах — кодировщик для Node. */
export interface ImageCodec {
  decode(file: Blob): Promise<{ width: number; height: number; image: unknown }>
  createCanvas(width: number, height: number): Canvas2D
}

export const browserCodec: ImageCodec = {
  async decode(file) {
    // createImageBitmap учитывает поворот из EXIF (фото с телефона не ляжет набок)
    const image = await createImageBitmap(file)
    return { width: image.width, height: image.height, image }
  },
  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas as unknown as Canvas2D
  },
}

/** Фото → data-URL для avatar: не больше 512 px по большей стороне, WebP или JPEG с качеством 0,8. */
export async function compressImage(file: Blob, codec: ImageCodec = browserCodec): Promise<string> {
  const { width, height, image } = await codec.decode(file)
  const size = fitWithin(width, height, AVATAR_MAX_SIDE)

  const encode = (type: string) => {
    const canvas = codec.createCanvas(size.width, size.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d недоступен')
    // У JPEG нет прозрачности: прозрачный фон PNG-логотипа стал бы чёрным, поэтому подкладываем белый
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size.width, size.height)
    }
    ctx.drawImage(image as never, 0, 0, size.width, size.height)
    return canvas.toDataURL(type, AVATAR_QUALITY)
  }

  // Браузер без кодировщика WebP (Safari) молча отдаёт PNG — тогда берём JPEG
  const webp = encode('image/webp')
  return webp.startsWith('data:image/webp') ? webp : encode('image/jpeg')
}
