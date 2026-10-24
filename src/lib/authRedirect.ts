// Куда вернуть пользователя по ссылке из письма «Подтвердите почту»: на тот же адрес приложения, где он
// регистрировался (продакшен, Preview-сборка Vercel, localhost). Supabase примет адрес, только если он есть
// в Redirect URLs (Authentication → URL Configuration); иначе отправит на Site URL — ничего не сломается.
// Корень, а не текущий путь: после подтверждения нужен вход и список сайтов, а не, например, /playground.

export function emailRedirectUrl(location: Pick<Location, 'origin'> = window.location): string {
  return `${location.origin}/`
}
