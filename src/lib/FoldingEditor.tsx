import { useState, useRef, useEffect, useCallback } from 'react'

interface FoldingEditorProps {
  value: string
  onChange: (value: string) => void
}

const FOLD_THRESHOLD = 80 // Сворачивать строки длиннее 80 символов

export function FoldingEditor({ value, onChange }: FoldingEditorProps) {
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const lines = value.split('\n')

  const toggleLine = useCallback((lineIndex: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineIndex)) {
        next.delete(lineIndex)
      } else {
        next.add(lineIndex)
      }
      return next
    })
  }, [])

  const startEditing = useCallback((lineIndex: number) => {
    setEditingLine(lineIndex)
    setEditValue(lines[lineIndex])
  }, [lines])

  const finishEditing = useCallback(() => {
    if (editingLine === null) return
    const newLines = [...lines]
    newLines[editingLine] = editValue
    onChange(newLines.join('\n'))
    setEditingLine(null)
    setEditValue('')
  }, [editingLine, editValue, lines, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finishEditing()
    }
    if (e.key === 'Escape') {
      setEditingLine(null)
    }
  }

  // Клик вне textarea закрывает редактирование
  useEffect(() => {
    if (editingLine === null) return
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        finishEditing()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingLine, finishEditing])

  return (
    <div className="h-full overflow-auto bg-zinc-900 text-zinc-100 font-mono text-sm">
      <div className="px-4 py-2 border-b border-zinc-700 text-xs text-zinc-500 flex items-center justify-between">
        <span>markdown</span>
        <span className="text-[10px] text-zinc-600">
          клик — редактировать • клик на «...» — развернуть
        </span>
      </div>
      <div className="p-2">
        {lines.map((line, i) => {
          const isLong = line.length > FOLD_THRESHOLD
          const isExpanded = expandedLines.has(i)
          const isEditing = editingLine === i

          // Определяем тип строки для подсветки
          let lineClass = 'text-zinc-300'
          let keyPart = ''
          let valuePart = line

          if (line.includes(':')) {
            const colonIndex = line.indexOf(':')
            keyPart = line.slice(0, colonIndex + 1)
            valuePart = line.slice(colonIndex + 1)
            lineClass = 'text-[#3adf97]' // зелёный для ключей
          }

          if (isEditing) {
            return (
              <div key={i} className="flex items-start py-0.5">
                <span className="text-zinc-600 w-8 text-right pr-2 select-none text-xs leading-6">
                  {i + 1}
                </span>
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={finishEditing}
                  className="flex-1 bg-zinc-800 text-zinc-100 px-2 py-1 rounded border border-[#3adf97] outline-none font-mono text-sm resize-none"
                  rows={Math.max(1, editValue.split('\n').length)}
                />
              </div>
            )
          }

          return (
            <div
              key={i}
              className="flex items-start py-0.5 group hover:bg-zinc-800/50 rounded px-1 cursor-text"
              onClick={() => startEditing(i)}
            >
              <span className="text-zinc-600 w-8 text-right pr-2 select-none text-xs leading-6">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {keyPart && (
                  <span className={lineClass}>{keyPart}</span>
                )}
                {isLong && !isExpanded ? (
                  <span className="text-zinc-400">
                    {valuePart.slice(0, 60)}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        toggleLine(i)
                      }}
                      className="ml-1 px-1.5 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
                    >
                      ... ({valuePart.length} симв.)
                    </button>
                  </span>
                ) : (
                  <span className="text-zinc-300 break-all">{valuePart}</span>
                )}
              </div>
              {isLong && isExpanded && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleLine(i)
                  }}
                  className="ml-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  свернуть
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}