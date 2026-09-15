import type { ThemeProps } from './shared/ThemeParts'
import { Avatar, LinksList } from './shared/ThemeParts'
import { SectionBody } from './shared/SectionBlocks'

export function MinimalTheme({ data, colors }: ThemeProps) {
  return (
    <div
      className="min-h-full w-full overflow-auto"
      style={{
        background: colors.background,
        color: colors.text,
        fontFamily: "'Inter', sans-serif",
        ['--accent' as string]: colors.accent,
      }}
    >
      <div className="max-w-xl mx-auto px-8 py-16">
        <header className="mb-12 animate-fade-in">
          <div className="flex items-start gap-6 mb-8">
            <Avatar src={data.avatar} name={data.name} size={80} />
            <div>
              <h1
                className="text-4xl font-serif leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", color: colors.text }}
              >
                {data.name}
              </h1>
              {data.title && (
                <p className="text-base mt-2 tracking-wide" style={{ color: colors.textMuted }}>
                  {data.title}
                </p>
              )}
              {data.location && (
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {data.location}
                </p>
              )}
            </div>
          </div>
          <LinksList links={data.links} colors={colors} />
        </header>

        <div className="space-y-10">
          {data.sections.map((section, i) => (
            <section
              key={section.title || `piece-${i}`}
              className="animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              {section.title && (
                <h2
                  className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
                  style={{ color: colors.accent }}
                >
                  {section.title}
                </h2>
              )}
              <div
                className="pl-4 border-l-2"
                style={{ borderColor: `${colors.accent}44`, color: colors.textMuted }}
              >
                <SectionBody section={section} colors={colors} />
              </div>
            </section>
          ))}
        </div>

        <footer
          className="mt-16 pt-6 border-t text-center text-xs"
          style={{ borderColor: `${colors.textMuted}33`, color: colors.textMuted }}
        >
          {data.name} · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
