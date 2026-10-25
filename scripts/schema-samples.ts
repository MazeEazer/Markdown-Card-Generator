// JSON-LD (Schema.org) для каждой ниши — вставить в Rich Results Test (вкладка «Код»):
//   https://search.google.com/test/rich-results
//
//   npm run schema:samples -- tutor        # одна ниша: barbershop | nails | tutor | photographer | other
//   npm run schema:samples                 # все ниши
//
// Код приложения импортирует модули без расширений — их загружает Vite (runnerImport), а не сам Node.js.
import { runnerImport } from 'vite'

const load = async <T>(path: string): Promise<T> => (await runnerImport<T>(path)).module

const { barbershop } = await load<typeof import('../src/data/templates/barbershop.ts')>('./src/data/templates/barbershop.ts')
const { nails } = await load<typeof import('../src/data/templates/nails.ts')>('./src/data/templates/nails.ts')
const { photographer } = await load<typeof import('../src/data/templates/photographer.ts')>('./src/data/templates/photographer.ts')
const { tutor } = await load<typeof import('../src/data/templates/tutor.ts')>('./src/data/templates/tutor.ts')
const { localBusiness } = await load<typeof import('../src/lib/structuredData.ts')>('./src/lib/structuredData.ts')
const { parseCardMarkdown } = await load<typeof import('../src/lib/parser.ts')>('./src/lib/parser.ts')

const samples: Record<string, string> = {
  barbershop,
  nails,
  tutor,
  photographer,
  other: barbershop.replace('business: barbershop', 'business: other'),
}
const only = process.argv[2]
for (const [niche, markdown] of Object.entries(samples)) {
  if (only && only !== niche) continue
  const ld = localBusiness(parseCardMarkdown(markdown).data!)
  console.log(`// ${niche}\n${JSON.stringify(ld, null, 2)}\n`)
}
