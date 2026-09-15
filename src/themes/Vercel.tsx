import type { ThemeProps } from './shared/ThemeParts'
import { Avatar, LinksList } from './shared/ThemeParts'
import { SectionBody } from './shared/SectionBlocks'

/** Бордер в духе vercel.com — единственный цвет, которого нет в палитре темы. */
const BORDER = '#262626'
const MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace"

export function VercelTheme({ data, colors }: ThemeProps) {
  return (
    <div
      className="min-h-full w-full overflow-auto relative"
      style={{
        background: '#000000',
        color: colors.text,
        fontFamily: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
        ['--accent' as string]: colors.accent,
      }}
    >
      {/* Свечение сверху — как в hero на vercel.com (белое, монохромное) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(120% 55% at 50% 0%, ${colors.accent}14 0%, transparent 65%)`,
        }}
      />

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        <header className="mb-12 animate-fade-in">
          <div className="flex items-center gap-5 mb-6">
            <div
              style={{
                padding: 4,
                borderRadius: 16,
                border: `1px solid ${BORDER}`,
                background: colors.surface,
              }}
            >
              <Avatar src={data.avatar} name={data.name} size={72} shape="square" textColor="#000000" />
            </div>
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-2"
                style={{ fontFamily: MONO, color: colors.accent }}
              >
                ▲ {data.location || 'profile'}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">{data.name}</h1>
              {data.title && (
                <p className="text-base mt-2" style={{ color: colors.textMuted }}>
                  {data.title}
                </p>
              )}
            </div>
          </div>
          <LinksList links={data.links} colors={colors} variant="outline" />
        </header>

        <div className="space-y-4">
          {data.sections.map((section, i) => (
            <section
              key={section.title || `piece-${i}`}
              className="animate-fade-in"
              style={{
                background: colors.surface,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '1.5rem',
                animationDelay: `${(i + 1) * 100}ms`,
              }}
            >
              {section.title && (
                <h2
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ fontFamily: MONO, color: colors.accent }}
                >
                  {section.title}
                </h2>
              )}
              <div className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                <SectionBody section={section} colors={colors} />
              </div>
            </section>
          ))}
        </div>

        <footer
          className="mt-16 pt-6 text-xs text-center"
          style={{ fontFamily: MONO, borderTop: `1px solid ${BORDER}`, color: colors.textMuted }}
        >
          ▲ {data.name} · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}