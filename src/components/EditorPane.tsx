import CodeEditor from '@uiw/react-textarea-code-editor'

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono">
        markdown
      </div>
      <CodeEditor
        value={value}
        language="markdown"
        placeholder="Введите Markdown..."
        onChange={(e) => onChange(e.target.value)}
        padding={16}
        style={{
          flex: 1,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          background: '#09090b',
          color: '#e4e4e7',
          minHeight: '100%',
        }}
      />
    </div>
  )
}
