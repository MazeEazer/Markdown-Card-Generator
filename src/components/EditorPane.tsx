import CodeEditor from '@uiw/react-textarea-code-editor'

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  return (
    <div className="h-full flex flex-col min-h-0 bg-zinc-950">
      <div className="shrink-0 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono">
        markdown
      </div>
      <div className="editor-scroll flex-1 min-h-0 overflow-y-auto">
        <CodeEditor
          value={value}
          language="markdown"
          placeholder="Введите Markdown..."
          onChange={(e) => onChange(e.target.value)}
          padding={16}
          style={{
            display: 'block',
            width: '100%',
            minHeight: '100%',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            background: '#09090b',
            color: '#e4e4e7',
          }}
        />
      </div>
    </div>
  )
}
