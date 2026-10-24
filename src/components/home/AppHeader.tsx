import type { ReactNode } from 'react'

/** Шапка главной и списка: название продукта слева, действия справа, тонкая рамка снизу. */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <span className="font-geist-mono text-sm font-semibold tracking-tight">MD Card</span>
        <div className="flex min-w-0 items-center gap-2">{children}</div>
      </div>
    </header>
  )
}
