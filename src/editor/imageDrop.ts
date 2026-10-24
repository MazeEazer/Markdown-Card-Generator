// Фото, брошенное прямо в редактор. Сам CodeMirror читает брошенный файл как текст и вставляет его в место броска,
// а двоичный файл отбрасывает — фото молча пропадало. Перехватываем: изображение уходит в обработчик (сжать и записать
// в avatar шапки), текст документа в месте броска не меняется. Остальные файлы и текст — как обычно у CodeMirror.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/** Первое изображение среди брошенных файлов. */
export function droppedImage(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const file of Array.from(data.files)) if (file.type.startsWith('image/')) return file
  return null
}

export function imageDrop(onImage: (file: File) => void): Extension {
  return EditorView.domEventHandlers({
    drop(event) {
      const file = droppedImage(event.dataTransfer)
      if (!file) return false
      event.preventDefault()
      onImage(file)
      return true
    },
  })
}
