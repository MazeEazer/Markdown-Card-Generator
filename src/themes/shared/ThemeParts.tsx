import ReactMarkdown from 'react-markdown'
import type { CardData, ThemeColors } from '../../types/card'
import { LinkIcon } from './Icons'

export interface ThemeProps {
  data: CardData
  colors: ThemeColors
}

export function SectionContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
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
    .filter(Boolean)

  if (skills.length <= 1) {
    return <SectionContent content={content} />
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
}: {
  links: CardData['links']
  colors: ThemeColors
  className?: string
}) {
  if (!links.length) return null

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ''}`}>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: `${colors.accent}18`, color: colors.accent }}
        >
          <LinkIcon icon={link.icon} color={colors.accent} />
          <span className="text-sm font-medium">{link.label}</span>
        </a>
      ))}
    </div>
  )
}

export function Avatar({ src, name, size = 96 }: { src?: string; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
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
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35, background: 'var(--accent)' }}
    >
      {initials}
    </div>
  )
}

export function isSkillsSection(title: string): boolean {
  return /навык|skill/i.test(title)
}
