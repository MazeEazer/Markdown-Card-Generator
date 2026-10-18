import { useEffect, useMemo, useState } from 'react'
import { BLOCK_NAMES, BLOCKS, type BlockName } from '../dsl/schema/blocks'
import {
  blockForm,
  blockMarkup,
  blockProblems,
  type BlockValues,
  emptyValues,
  type FormField,
  missingRequired,
} from '../editor/insertBlock'

interface AddBlockDialogProps {
  /** Текст документа и позиция курсора на момент открытия — для проверки блока на своём месте */
  text: string
  pos: number
  onInsert: (markup: string, name: BlockName) => void
  onClose: () => void
}

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm placeholder:text-zinc-400'
const BUTTON_SECONDARY =
  'whitespace-nowrap px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm'

const SEVERITY_STYLE = {
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-sky-600 dark:text-sky-400',
} as const

function FieldInput({ field, value, onChange, id }: { field: FormField; value: string; onChange: (v: string) => void; id: string }) {
  if (field.options) {
    return (
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="">— не выбрано —</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }
  if (field.multiline) {
    return <textarea id={id} rows={2} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT} />
  }
  return <input id={id} type="text" value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT} />
}

function FieldRow({ field, value, onChange, id }: { field: FormField; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
        <code className="ml-2 text-xs text-zinc-400">{field.key}</code>
      </label>
      <FieldInput field={field} value={value} onChange={onChange} id={id} />
    </div>
  )
}

/** Окно «Добавить блок»: выбор блока → форма по схеме → проверка валидатором → вставка разметки. */
export function AddBlockDialog({ text, pos, onInsert, onClose }: AddBlockDialogProps) {
  const [name, setName] = useState<BlockName | null>(null)
  const [values, setValues] = useState<BlockValues | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const form = useMemo(() => (name ? blockForm(name) : null), [name])
  const markup = form && values ? blockMarkup(form, values) : ''
  const missing = form && values ? missingRequired(form, values) : []
  // Пропущенные обязательные поля форма показывает сама (missing) — то же сообщение валидатора не дублируем
  const problems = useMemo(
    () => (markup ? blockProblems(text, pos, markup).filter((d) => d.code !== 'missing-item-field') : []),
    [markup, text, pos],
  )
  const hasErrors = problems.some((d) => d.severity === 'error')

  const choose = (block: BlockName) => {
    const next = blockForm(block)
    setName(block)
    setValues(emptyValues(next))
  }

  const setItem = (index: number, key: string, value: string) =>
    setValues((v) => v && { ...v, items: v.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)) })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-block-title"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 id="add-block-title" className="text-lg font-semibold">
            {form ? `Добавить блок: ${form.label}` : 'Добавить блок'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {!form || !values ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BLOCK_NAMES.map((block) => (
                <button
                  key={block}
                  type="button"
                  onClick={() => choose(block)}
                  className="text-left px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="block font-medium">{BLOCKS[block].label}</span>
                  <span className="block text-xs text-zinc-500">{BLOCKS[block].description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500">{form.description}</p>

              <div>
                <label htmlFor="block-heading" className="block text-sm mb-1">
                  Заголовок раздела на сайте <code className="ml-2 text-xs text-zinc-400">##</code>
                </label>
                <input
                  id="block-heading"
                  type="text"
                  value={values.heading}
                  onChange={(e) => setValues({ ...values, heading: e.target.value })}
                  className={INPUT}
                />
              </div>

              {form.attrs.map((field) => (
                <FieldRow
                  key={field.key}
                  id={`attr-${field.key}`}
                  field={field}
                  value={values.attrs[field.key] ?? ''}
                  onChange={(v) => setValues({ ...values, attrs: { ...values.attrs, [field.key]: v } })}
                />
              ))}

              {form.note && <p className="text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2">{form.note}</p>}

              {form.body && (
                <div>
                  <label htmlFor="block-body" className="block text-sm mb-1">
                    Содержимое
                  </label>
                  <p className="text-xs text-zinc-500 mb-1">{form.body.hint}</p>
                  <textarea
                    id="block-body"
                    rows={5}
                    value={values.body}
                    placeholder={form.body.placeholder}
                    onChange={(e) => setValues({ ...values, body: e.target.value })}
                    className={`${INPUT} font-mono [font-variant-ligatures:none]`}
                  />
                </div>
              )}

              {form.item &&
                values.items.map((item, index) => (
                  <fieldset key={index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                    <legend className="px-1 text-sm font-medium">
                      {form.itemLabel} {values.items.length > 1 ? index + 1 : ''}
                    </legend>
                    {form.item!.map((field) => (
                      <FieldRow
                        key={field.key}
                        id={`item-${index}-${field.key}`}
                        field={field}
                        value={item[field.key] ?? ''}
                        onChange={(v) => setItem(index, field.key, v)}
                      />
                    ))}
                    {values.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setValues({ ...values, items: values.items.filter((_, i) => i !== index) })}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Убрать
                      </button>
                    )}
                  </fieldset>
                ))}
              {form.item && form.item.some((field) => field.required) && (
                <button type="button" onClick={() => setValues({ ...values, items: [...values.items, {}] })} className={BUTTON_SECONDARY}>
                  + Ещё: {form.itemLabel.toLowerCase()}
                </button>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Что вставится в редактор</p>
                <pre className="text-xs font-mono [font-variant-ligatures:none] whitespace-pre-wrap break-words rounded-lg bg-zinc-950 text-zinc-200 p-3">{markup}</pre>
              </div>

              {(missing.length > 0 || problems.length > 0) && (
                <ul className="text-sm space-y-1" aria-live="polite">
                  {missing.map((message) => (
                    <li key={message} className="text-red-600 dark:text-red-400">
                      {message}
                    </li>
                  ))}
                  {problems.map((d, i) => (
                    <li key={`${d.code}-${i}`} className={SEVERITY_STYLE[d.severity]}>
                      {d.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          {form && (
            <>
              <button
                type="button"
                onClick={() => onInsert(markup, form.name)}
                disabled={missing.length > 0 || hasErrors}
                className="whitespace-nowrap px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
              >
                Вставить
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(null)
                  setValues(null)
                }}
                className={BUTTON_SECONDARY}
              >
                ← Назад
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY} ml-auto`}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
