import type { ThemeProps } from './shared/ThemeParts'
import { Avatar, LinksList } from './shared/ThemeParts'
import { SectionBody } from './shared/SectionBlocks'

export function GlassTheme({ data, colors }: ThemeProps) {
  return (
    <div
      className="min-h-full w-full overflow-auto relative"
      style={{
        background: `linear-gradient(160deg, ${colors.accentLight}44 0%, ${colors.background} 50%, ${colors.accent}22 100%)`,
        color: colors.text,
        fontFamily: "'Inter', sans-serif",
        ['--accent' as string]: colors.accent,
      }}
    >
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-5">
        <header
          className="rounded-3xl p-8 text-center animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="rounded-full p-1"
              style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})` }}
            >
              <Avatar src={data.avatar} name={data.name} size={96} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          {data.title && (
            <p className="text-base mt-1 font-medium" style={{ color: colors.accent }}>
              {data.title}
            </p>
          )}
          {data.location && (
            <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
              {data.location}
            </p>
          )}
          <LinksList links={data.links} colors={colors} className="justify-center mt-4" />
        </header>

        {data.sections.map((section, i) => (
          <section
            key={section.title || `piece-${i}`}
            className="rounded-2xl p-6 animate-fade-in"
            style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.35)',
              animationDelay: `${(i + 1) * 100}ms`,
            }}
          >
            {section.title && (
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
                {section.title}
              </h2>
            )}
            <div style={{ color: colors.textMuted }}>
              <SectionBody section={section} colors={colors} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
