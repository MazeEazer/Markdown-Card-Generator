import type { BusinessName } from '../schema/frontmatter.ts'
import { barbershop } from './barbershop.ts'
import { nails } from './nails.ts'
import { other } from './other.ts'
import { photographer } from './photographer.ts'
import { tutor } from './tutor.ts'
import type { NicheProfile } from './types.ts'

export type { NicheProfile, ProfileSection, Slot } from './types.ts'

export const PROFILES: Record<BusinessName, NicheProfile> = { barbershop, tutor, nails, photographer, other }

/** Ниши, у которых есть слова в описании и принудительные названия разделов (все, кроме «другого»). */
export const NICHES = [barbershop, tutor, nails, photographer] as const

export function profileOf(business: string | undefined | null): NicheProfile | null {
  return business && business in PROFILES ? PROFILES[business as BusinessName] : null
}

/**
 * Ниша по словам описания: единственная подходящая или null (ни одной или несколько — не угадываем).
 * «Стрижка собак, груминг» — null: слова барбершопа с животными не совпадают.
 */
export function detectNiche(description: string): BusinessName | null {
  const found = NICHES.filter((profile) => profile.matches(description))
  return found.length === 1 ? found[0].business : null
}
