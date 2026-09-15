import ReactMarkdown from 'react-markdown'
import type { CardData, ThemeColors } from '../../types/card'
import { LinkIcon } from './Icons'

export interface ThemeProps {
  data: CardData
  colors: ThemeColors
}

export function SectionContent({
  content,
  className,
  accent,
}: {
  content: string
  className?: string
  accent?: string
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
          // `##` без названия → линия между «кусками» секции
          hr: () => (
            <hr
              style={{
                border: 'none',
                height: 1,
                margin: '1rem 0',
                opacity: 0.3,
                background: accent ?? 'currentColor',
              }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function SkillsTags({ content, accent }: { content: string; accent: string }) {
  const skills = content
    .split(/[,;\n]/)
    .map((s) => s.trim())
    // маркер «куска» секции (**/***) не должен попадать в теги
    .filter((s) => Boolean(s) && !/^\*+$/.test(s))

  if (skills.length <= 1) {
    return <SectionContent content={content} accent={accent} />
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {skill}
        </span>
      ))}
    </div>
  )
}

export function LinksList({
  links,
  colors,
  className,
  variant = 'soft',
}: {
  links: CardData['links']
  colors: ThemeColors
  className?: string
  /** soft — плашки в цвете акцента, outline — нейтральные с бордером */
  variant?: 'soft' | 'outline'
}) {
  if (!links.length) return null

  const isOutline = variant === 'outline'
  const linkStyle = isOutline
    ? { backgroundColor: `${colors.text}0a`, border: `1px solid ${colors.textMuted}44`, color: colors.text }
    : { backgroundColor: `${colors.accent}18`, color: colors.accent }

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ''}`}>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={linkStyle}
        >
          <LinkIcon icon={link.icon} color={isOutline ? colors.text : colors.accent} />
          <span className="text-sm font-medium">{link.label}</span>
        </a>
      ))}
    </div>
  )
}

export function Avatar({
  src,
  name,
  size = 96,
  shape = 'circle',
  textColor = '#ffffff',
}: {
  src?: string
  name: string
  size?: number
  shape?: 'circle' | 'square'
  /** Цвет инициалов — на светлом акценте (монохромные темы) нужен тёмный */
  textColor?: string
}) {
  const borderRadius = shape === 'square' ? Math.round(size * 0.18) : 9999

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        crossOrigin="anonymous" // ← критично для экспорта PDF
        width={size}
        height={size}
        className="object-cover"
        style={{ width: size, height: size, borderRadius }}
      />
    )
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className="flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: 'var(--accent)',
        color: textColor,
        borderRadius,
      }}
    >
      {initials}
    </div>
  )
}

export function isSkillsSection(title: string): boolean {
  return /навык|skill/i.test(title)
}

/**
 * Монохромная ли тема: акцент — оттенок серого.
 * Используется для декоративных элементов, которые в чёрно-белых темах (Vercel)
 * должны оставаться нейтральными.
 */
export function isMonochromeAccent(color: string): boolean {
  const hex = color.replace('#', '')
  if (hex.length < 6) return false
  const r = hex.slice(0, 2).toLowerCase()
  const g = hex.slice(2, 4).toLowerCase()
  const b = hex.slice(4, 6).toLowerCase()
  return r === g && g === b
}