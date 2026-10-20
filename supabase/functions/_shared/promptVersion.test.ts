import { assertEquals, assertMatch, assertNotEquals } from '@std/assert'
import { buildSystemPrompt } from '../../../src/dsl/prompt.ts'
import { promptVersion, sha256Hex } from './promptVersion.ts'

Deno.test('SHA-256 на эталонных примерах', async () => {
  // FIPS 180-2, пример «abc», и пустая строка
  assertEquals(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assertEquals(await sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  // Кириллица и «ёлочки» — как UTF-8: сверено с `printf '%s' 'Барбершоп «Борода»' | shasum -a 256`
  assertEquals(await sha256Hex('Барбершоп «Борода»'), '10f7891de3bb33424775e87e391fea7cdec0ecdec728eb86e9b65df78bf03a77')
})

Deno.test('версия промпта — первые 12 знаков хеша, своя для каждого режима и вида бизнеса', async () => {
  const markdown = await promptVersion(buildSystemPrompt({ mode: 'markdown' }))
  assertMatch(markdown, /^[0-9a-f]{12}$/)
  assertEquals(markdown, (await sha256Hex(buildSystemPrompt({ mode: 'markdown' }))).slice(0, 12))
  assertNotEquals(markdown, await promptVersion(buildSystemPrompt({ mode: 'json' })))
  assertNotEquals(markdown, await promptVersion(buildSystemPrompt({ mode: 'markdown', business: 'barbershop' })))
  // Тот же текст — та же версия
  assertEquals(markdown, await promptVersion(buildSystemPrompt({ mode: 'markdown' })))
})
