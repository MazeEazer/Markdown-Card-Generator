import { useState, useRef, useCallback, type ReactNode } from 'react'

// 🆕 Функция для сжатия изображения перед конвертацией в base64
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 256 // Оптимальный размер для аватара

        let width = img.width
        let height = img.height

        // Сохраняем пропорции
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // Сжимаем в JPEG с качеством 0.7 (идеальный баланс размер/качество)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

interface DropZoneProps {
  onImage: (dataUrl: string) => void
  children: ReactNode
}

export function DropZone({ onImage, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const counter = useRef(0)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counter.current++
    if (e.dataTransfer.items?.length) setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counter.current--
    if (counter.current === 0) setIsDragging(false)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => { // 🆕 Добавили async
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      counter.current = 0

      const file = e.dataTransfer.files?.[0]
      if (!file?.type.startsWith('image/')) return

      try {
        // 🆕 Сжимаем изображение перед передачей
        const compressedDataUrl = await compressImage(file)
        onImage(compressedDataUrl)
      } catch (err) {
        console.error('Ошибка при обработке изображения:', err)
      }
    },
    [onImage]
  )

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative h-full"
    >
      {children}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-[#3adf97] bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-[#3adf97]">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold tracking-wide">Отпустите, чтобы загрузить фото</span>
          </div>
        </div>
      )}
    </div>
  )
}