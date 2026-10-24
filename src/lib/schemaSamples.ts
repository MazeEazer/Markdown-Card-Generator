// JSON-LD (Schema.org) для каждой ниши — вставить в Rich Results Test (вкладка «Код»):
//   https://search.google.com/test/rich-results
// Запуск: npx vite-node src/lib/schemaSamples.ts [ниша]   (barbershop | nails | tutor | photographer | other)
import { barbershop } from '../data/templates/barbershop'
import { nails } from '../data/templates/nails'
import { photographer } from '../data/templates/photographer'
import { tutor } from '../data/templates/tutor'
import { localBusiness } from './structuredData'
import { parseCardMarkdown } from './parser'

const samples: Record<string, string> = {
  barbershop,
  nails,
  tutor,
  photographer,
  other: barbershop.replace('business: barbershop', 'business: other'),
}
const only = (globalThis as { process?: { argv: string[] } }).process?.argv[2]
for (const [niche, markdown] of Object.entries(samples)) {
  if (only && only !== niche) continue
  const ld = localBusiness(parseCardMarkdown(markdown).data!)
  console.log(`// ${niche}\n${JSON.stringify(ld, null, 2)}\n`)
}
