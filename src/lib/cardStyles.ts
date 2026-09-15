export function getCardExportCss(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; color: inherit; }
    img { display: block; max-width: 100%; }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.6; }
    }
    .animate-fade-in { animation: fade-in 0.6s ease forwards; opacity: 0; }
    .animate-pulse { animation: pulse 4s ease-in-out infinite; }

    .min-h-full { min-height: 100%; }
    .w-full { width: 100%; }
    .overflow-auto { overflow: auto; }
    .overflow-hidden { overflow: hidden; }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .inset-0 { inset: 0; }
    .pointer-events-none { pointer-events: none; }
    .max-w-2xl { max-width: 42rem; }
    .max-w-xl { max-width: 36rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .px-8 { padding-left: 2rem; padding-right: 2rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
    .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
    .p-8 { padding: 2rem; }
    .p-6 { padding: 1.5rem; }
    .p-5 { padding: 1.25rem; }
    .p-1 { padding: 0.25rem; }
    .p-0\\.5 { padding: 0.125rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .pl-4 { padding-left: 1rem; }
    .pl-5 { padding-left: 1.25rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .pt-6 { padding-top: 1.5rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-10 { margin-top: 2.5rem; }
    .mt-16 { margin-top: 4rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-5 > * + * { margin-top: 1.25rem; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-10 > * + * { margin-top: 2.5rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .rounded-full { border-radius: 9999px; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-serif { font-family: 'Playfair Display', serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .text-center { text-align: center; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .uppercase { text-transform: uppercase; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-center { justify-content: center; }
    .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .border-l-2 { border-left-width: 2px; border-left-style: solid; }
    .border-t { border-top-width: 1px; border-top-style: solid; }
    .list-disc { list-style-type: disc; }
    .object-cover { object-fit: cover; }
    .blur-3xl { filter: blur(64px); }
    .opacity-40 { opacity: 0.4; }
    .opacity-30 { opacity: 0.3; }
    .w-96 { width: 24rem; }
    .h-96 { height: 24rem; }
    .w-80 { width: 20rem; }
    .h-80 { height: 20rem; }
    .-top-32 { top: -8rem; }
    .-right-32 { right: -8rem; }
    .-bottom-32 { bottom: -8rem; }
    .-left-32 { left: -8rem; }
    .transition-opacity { transition: opacity 0.2s; }
    .hover\\:opacity-80:hover { opacity: 0.8; }
    .last\\:mb-0:last-child { margin-bottom: 0; }

    .md-accordion summary { list-style: none; cursor: pointer; }
    .md-accordion summary::-webkit-details-marker { display: none; }
    .md-accordion .md-accordion-caret { display: inline-block; transition: transform 0.2s ease; }
    .md-accordion details[open] .md-accordion-caret { transform: rotate(90deg); }

    .md-card { transition: transform 0.2s ease, filter 0.2s ease; }
    a.md-card:hover { transform: translateY(-2px); filter: brightness(1.15); }
  `
}
