// Шаг 1: проверка ключа GigaChat с вашего компьютера (Node.js 20+, без зависимостей).
//
// macOS / Linux:
//   GIGACHAT_AUTH_KEY="ваш_ключ" NODE_EXTRA_CA_CERTS=./certs/russian_trusted_ca_bundle.pem node scripts/gigachat-local-check.mjs
// Windows (PowerShell):
//   $env:GIGACHAT_AUTH_KEY="ваш_ключ"; $env:NODE_EXTRA_CA_CERTS=".\certs\russian_trusted_ca_bundle.pem"; node scripts/gigachat-local-check.mjs
//
// Ключ — в Studio: проект GigaChat API → «Ключ авторизации» (строка base64, НЕ Client Secret).
import { randomUUID } from 'node:crypto'

const key = process.env.GIGACHAT_AUTH_KEY
if (!key) {
  console.error('❌ Не задан GIGACHAT_AUTH_KEY')
  process.exit(1)
}

function explain(e) {
  const code = e.cause?.code ?? e.code ?? ''
  if (/CERT|SELF_SIGNED|UNABLE_TO_GET_ISSUER/.test(code)) {
    return `${code} — проблема с сертификатом. Проверьте путь в NODE_EXTRA_CA_CERTS.`
  }
  return `${code} ${e.cause?.message ?? e.message}`
}

try {
  let t = Date.now()
  const oauth = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${key}`,
      RqUID: randomUUID(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `scope=${process.env.GIGACHAT_SCOPE ?? 'GIGACHAT_API_PERS'}`,
  })
  if (!oauth.ok) {
    console.error(`❌ OAuth ${oauth.status}: ${await oauth.text()}`)
    console.error('   401 — неверный ключ; 400 — проверьте scope (физлицо: GIGACHAT_API_PERS).')
    process.exit(1)
  }
  const { access_token } = await oauth.json()
  console.log(`✅ OAuth: токен получен за ${Date.now() - t} мс`)

  t = Date.now()
  const chat = await fetch('https://api.giga.chat/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'md-card',
    },
    body: JSON.stringify({
      model: 'GigaChat-2',
      messages: [{ role: 'user', content: 'Ответь одним словом: работает?' }],
    }),
  })
  if (!chat.ok) {
    console.error(`❌ Chat ${chat.status}: ${await chat.text()}`)
    process.exit(1)
  }
  const data = await chat.json()
  console.log(`✅ Chat за ${Date.now() - t} мс: «${data.choices[0].message.content}», токенов: ${data.usage.total_tokens}`)
  console.log('\nКлюч рабочий. Переходите к шагу 2 (Supabase).')
} catch (e) {
  console.error('❌ Сетевая ошибка:', explain(e))
  process.exit(1)
}
