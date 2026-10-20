// Фото в документе — строка «data:image/jpeg;base64,…» на десятки килобайт: в редакторе она переносится на экран
// и больше. Показываем вместо неё плашку «📷 фото, 26 КБ». Текст документа не меняется: плашка — только отображение,
// курсор перескакивает её целиком, удаление убирает фото целиком.
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'

/** Короче этого — не сворачиваем: такую строку видно целиком. */
const MIN_BASE64 = 200

export interface DataUrlRange {
  from: number
  to: number
  /** Размер изображения в байтах (из длины base64) */
  bytes: number
  /** Тип после image/: jpeg, png, webp… */
  format: string
}

/** Все data-URL изображений в тексте. */
export function dataUrlRanges(text: string): DataUrlRange[] {
  const ranges: DataUrlRange[] = []
  for (const m of text.matchAll(/data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)/gi)) {
    const base64 = m[2]
    if (base64.length < MIN_BASE64) continue
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    ranges.push({ from: m.index, to: m.index + m[0].length, bytes: Math.floor((base64.length * 3) / 4) - padding, format: m[1].toLowerCase() })
  }
  return ranges
}

/** «26 КБ», «800 Б», «1,2 МБ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

class PhotoWidget extends WidgetType {
  readonly label: string
  constructor(label: string) {
    super()
    this.label = label
  }

  eq(other: PhotoWidget) {
    return other.label === this.label
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-data-url'
    span.textContent = `📷 фото, ${this.label}`
    span.title = 'Фото хранится прямо в тексте. Чтобы заменить — перетащите другое фото на превью; чтобы убрать — удалите строку'
    return span
  }

  ignoreEvent() {
    return false
  }
}

function build(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const range of dataUrlRanges(state.doc.toString())) {
    builder.add(range.from, range.to, Decoration.replace({ widget: new PhotoWidget(`${range.format}, ${formatBytes(range.bytes)}`) }))
  }
  return builder.finish()
}

const photos = StateField.define<DecorationSet>({
  create: build,
  update: (value, tr) => (tr.docChanged ? build(tr.state) : value),
  provide: (field) => [EditorView.decorations.from(field), EditorView.atomicRanges.of((view) => view.state.field(field))],
})

const theme = EditorView.baseTheme({
  '.cm-data-url': {
    display: 'inline-block',
    padding: '0 6px',
    borderRadius: '4px',
    background: 'rgba(129, 140, 248, 0.18)',
    color: '#c7d2fe',
    fontSize: '0.92em',
    cursor: 'default',
  },
})

export function dataUrlFolding(): Extension {
  return [photos, theme]
}
