import type { ReactNode } from 'react'
import type { AmenityKey } from '../../dsl/schema/amenities'

// Иконки удобств — отдельный набор от Icons.tsx (ICONS): имена удобств не попадают в иконки карточек и промпт.
// Record<AmenityKey, …>: TypeScript не даст забыть иконку для удобства из схемы языка.
const svg = (color: string, size: number, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const AMENITY_ICONS: Record<AmenityKey, (color: string, size: number) => ReactNode> = {
  parking: (c, s) =>
    svg(c, s, (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17V7h4a3 3 0 010 6H9" />
      </>
    )),
  wifi: (c, s) =>
    svg(c, s, (
      <>
        <path d="M5 12.55a11 11 0 0114.08 0" />
        <path d="M1.42 9a16 16 0 0121.16 0" />
        <path d="M8.53 16.11a6 6 0 016.95 0" />
        <path d="M12 20h.01" />
      </>
    )),
  card: (c, s) =>
    svg(c, s, (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    )),
  accessible: (c, s) =>
    svg(c, s, (
      <>
        <circle cx="12" cy="4" r="2" />
        <path d="M12 7v6h5l2 5" />
        <path d="M8 11a5 5 0 105 8" />
      </>
    )),
  kids: (c, s) =>
    svg(c, s, (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <path d="M9 9h.01M15 9h.01" />
      </>
    )),
  pets: (c, s) =>
    svg(c, s, (
      <>
        <circle cx="6" cy="10" r="2" />
        <circle cx="10" cy="5.5" r="2" />
        <circle cx="14" cy="5.5" r="2" />
        <circle cx="18" cy="10" r="2" />
        <path d="M12 12c-3 0-5 3-5 5.5 0 2 1.5 2.5 3 2.5 1 0 1.5-.5 2-.5s1 .5 2 .5c1.5 0 3-.5 3-2.5 0-2.5-2-5.5-5-5.5z" />
      </>
    )),
  coffee: (c, s) =>
    svg(c, s, (
      <>
        <path d="M17 8h1a4 4 0 010 8h-1" />
        <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
        <path d="M6 2v3M10 2v3M14 2v3" />
      </>
    )),
  waiting: (c, s) =>
    svg(c, s, (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    )),
  delivery: (c, s) =>
    svg(c, s, (
      <>
        <rect x="1" y="3" width="15" height="13" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    )),
  ac: (c, s) => svg(c, s, <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />),
  wardrobe: (c, s) =>
    svg(c, s, (
      <>
        <path d="M12 7a2 2 0 112 2c-1 .5-2 1-2 2v1" />
        <path d="M12 12L3 18a1 1 0 00.6 1.8h16.8A1 1 0 0021 18l-9-6z" />
      </>
    )),
  online: (c, s) =>
    svg(c, s, (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    )),
  visit: (c, s) =>
    svg(c, s, (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>
    )),
  certificate: (c, s) =>
    svg(c, s, (
      <>
        <rect x="3" y="8" width="18" height="4" />
        <path d="M12 8v13M19 12v9H5v-9" />
        <path d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5" />
      </>
    )),
}

/** Иконка удобства; для неизвестного key — галочка. */
export function AmenityIcon({ amenity, color, size = 22 }: { amenity: string; color: string; size?: number }) {
  const render = AMENITY_ICONS[amenity as AmenityKey]
  return <>{render ? render(color, size) : svg(color, size, <path d="M20 6L9 17l-5-5" />)}</>
}
