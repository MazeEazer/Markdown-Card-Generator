import { describe, expect, it } from 'vitest'
import { droppedImage } from './imageDrop'

const file = (name: string, type: string) => new File(['x'], name, { type })
const drop = (...files: File[]) => ({ files }) as unknown as DataTransfer

describe('droppedImage: что перехватываем при броске в редактор', () => {
  it('фото — перехватываем', () => {
    expect(droppedImage(drop(file('me.jpg', 'image/jpeg')))?.name).toBe('me.jpg')
  })

  it('среди нескольких файлов берём первое изображение', () => {
    expect(droppedImage(drop(file('a.txt', 'text/plain'), file('b.png', 'image/png')))?.name).toBe('b.png')
  })

  it('текстовый файл и перетаскивание текста — оставляем CodeMirror', () => {
    expect(droppedImage(drop(file('a.md', 'text/markdown')))).toBeNull()
    expect(droppedImage(drop())).toBeNull()
    expect(droppedImage(null)).toBeNull()
  })
})
