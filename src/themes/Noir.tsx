import type { ThemeProps } from './shared/ThemeParts'
import { Avatar, LinksList } from './shared/ThemeParts'
import { SectionBody } from './shared/SectionBlocks'

export function NoirTheme({ data, colors }: ThemeProps) {
  return (
    <div
      className="min-h-full w-full overflow-auto"
      style={{
        background: colors.background,
        color: colors.text,
        fontFamily: "'JetBrains Mono', monospace",
        ['--accent' as string]: colors.accent,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${colors.accent}15 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${colors.accentDark}20 0%, transparent 40%)`,
        }}
      />

      <div className="relative max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10 animate-fade-in">
          <div className="flex items-center gap-5 mb-6">
            <div
              className="rounded-lg p-0.5"
              style={{ boxShadow: `0 0 20px ${colors.accent}66` }}
            >
              <Avatar src={data.avatar} name={data.name} size={72} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.accent }}>
                // profile
              </p>
              <h1 className="text-2xl font-bold">{data.name}</h1>
              {data.title && (
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {data.title}
                </p>
              )}
              {data.location && (
                <p className="text-xs mt-1 font-mono" style={{ color: colors.textMuted }}>
                  @ {data.location}
                </p>
              )}
            </div>
          </div>
          <LinksList links={data.links} colors={colors} />
        </header>

        <div className="space-y-4">
          {data.sections.map((section, i) => (
            <section
              key={section.title || `piece-${i}`}
              className="rounded-lg p-5 animate-fade-in"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.accent}33`,
                boxShadow: `0 0 15px ${colors.accent}11`,
                animationDelay: `${(i + 1) * 100}ms`,
              }}
            >
              {section.title && (
                <h2
                  className="text-xs font-bold uppercase tracking-widest mb-3 font-mono"
                  style={{ color: colors.accent }}
                >
                  {'>'} {section.title}
                </h2>
              )}
              <div className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                <SectionBody section={section} colors={colors} />
              </div>
            </section>
          ))}
        </div>

        <p className="text-center text-xs mt-10 font-mono" style={{ color: `${colors.textMuted}88` }}>
          {'/*'} generated with md-card {'*/'}
        </p>
      </div>
    </div>
  )
}
