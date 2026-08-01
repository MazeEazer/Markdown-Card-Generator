import type { ThemeProps } from './shared/ThemeParts'
import { Avatar, isSkillsSection, LinksList, SectionContent, SkillsTags } from './shared/ThemeParts'

export function AuroraTheme({ data, colors }: ThemeProps) {
  return (
    <div
      className="min-h-full w-full overflow-auto"
      style={{
        background: `linear-gradient(135deg, ${colors.background}, ${colors.accentLight}33, ${colors.accent}22)`,
        color: colors.text,
        fontFamily: "'Inter', sans-serif",
        ['--accent' as string]: colors.accent,
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-40 animate-pulse"
          style={{ background: colors.accent }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-30"
          style={{ background: colors.accentLight }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-12 space-y-6">
        <header
          className="backdrop-blur-xl rounded-3xl p-8 text-center animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: `0 8px 32px ${colors.accent}22`,
          }}
        >
          <div className="flex justify-center mb-4">
            <Avatar src={data.avatar} name={data.name} size={100} />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: colors.text }}>
            {data.name}
          </h1>
          {data.title && (
            <p className="text-lg font-medium mb-2" style={{ color: colors.accent }}>
              {data.title}
            </p>
          )}
          {data.location && (
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
              📍 {data.location}
            </p>
          )}
          <LinksList links={data.links} colors={colors} className="justify-center" />
        </header>

        {data.sections.map((section, i) => (
          <section
            key={section.title}
            className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in"
            style={{
              background: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.5)',
              animationDelay: `${(i + 1) * 100}ms`,
            }}
          >
            <h2
              className="text-lg font-semibold mb-3 pb-2 border-b"
              style={{ color: colors.accent, borderColor: `${colors.accent}33` }}
            >
              {section.title}
            </h2>
            {isSkillsSection(section.title) ? (
              <SkillsTags content={section.content} accent={colors.accent} />
            ) : (
              <div style={{ color: colors.textMuted }}>
                <SectionContent content={section.content} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
