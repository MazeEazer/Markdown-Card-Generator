import { createCanvas, loadImage } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { AVATAR_MAX_SIDE, compressImage, fitWithin, type ImageCodec } from './imageCompress'

// Настоящий кодировщик PNG/JPEG/WebP для Node: в тестах нет браузерного canvas
const nodeCodec: ImageCodec = {
  async decode(file) {
    const image = await loadImage(new Uint8Array(await file.arrayBuffer()))
    return { width: image.width, height: image.height, image }
  },
  createCanvas: (width, height) => createCanvas(width, height) as unknown as ReturnType<ImageCodec['createCanvas']>,
}

/** «Фото с телефона»: шум, чтобы PNG не сжался в ничто, — как настоящая фотография. */
function photoPng(width: number, height: number): Blob {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  let seed = 7
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    img.data[i] = (i / 4) % width % 256
    img.data[i + 1] = seed % 256
    img.data[i + 2] = Math.floor(i / 4 / width) % 256
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return new Blob([new Uint8Array(canvas.toBuffer('image/png'))], { type: 'image/png' })
}

/** Байты из data-URL (Buffer в тестах фронтенда недоступен по типам). */
const dataUrlBytes = (dataUrl: string) => Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0))

const decodeDataUrl = (dataUrl: string) => loadImage(dataUrlBytes(dataUrl))

describe('fitWithin', () => {
  it('большое фото вписывается в 512 по большей стороне с сохранением пропорций', () => {
    expect(fitWithin(4000, 3000, 512)).toEqual({ width: 512, height: 384 })
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512 })
  })

  it('маленькое фото не увеличивается', () => {
    expect(fitWithin(300, 200, 512)).toEqual({ width: 300, height: 200 })
  })
})

describe('compressImage', () => {
  it('фото 2000×1500: результат не больше 512 px и намного меньше исходного', async () => {
    const original = photoPng(2000, 1500)
    const dataUrl = await compressImage(original, nodeCodec)
    expect(dataUrl).toMatch(/^data:image\/webp;base64,/)
    const bytes = dataUrlBytes(dataUrl).length
    expect(bytes).toBeLessThan(original.size / 10)
    const result = await decodeDataUrl(dataUrl)
    expect(Math.max(result.width, result.height)).toBe(AVATAR_MAX_SIDE)
    expect(result.width / result.height).toBeCloseTo(4 / 3, 2)
  })

  it('браузер без WebP (Safari отдаёт PNG) — сохраняется JPEG', async () => {
    const noWebp: ImageCodec = {
      ...nodeCodec,
      createCanvas(width, height) {
        const canvas = nodeCodec.createCanvas(width, height)
        const toDataURL = canvas.toDataURL.bind(canvas)
        canvas.toDataURL = (type, quality) => (type === 'image/webp' ? toDataURL('image/png', quality) : toDataURL(type, quality))
        return canvas
      },
    }
    const original = photoPng(1200, 1200)
    const dataUrl = await compressImage(original, noWebp)
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/)
    expect(dataUrlBytes(dataUrl).length).toBeLessThan(original.size)
  })

  it('маленькое фото остаётся своего размера', async () => {
    const result = await decodeDataUrl(await compressImage(photoPng(200, 100), nodeCodec))
    expect([result.width, result.height]).toEqual([200, 100])
  })
})
