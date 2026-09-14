import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto text-center space-y-4">
        <h2 className="text-2xl font-bold">Проверьте почту!</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Мы отправили ссылку для подтверждения на <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-2xl font-bold text-center">Регистрация</h2>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      <input
        type="text"
        placeholder="Имя"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        required
        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      />
      <input
        type="password"
        placeholder="Пароль (мин. 6 символов)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Регистрируемся...' : 'Зарегистрироваться'}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-600 hover:underline">
          Войти
        </button>
      </p>
    </form>
  )
}