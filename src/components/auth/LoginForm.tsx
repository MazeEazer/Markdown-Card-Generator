import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200" role="alert">
          {error}
        </div>
      )}
      <input
        type="email"
        placeholder="Email"
        aria-label="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="ui-field"
      />
      <input
        type="password"
        placeholder="Пароль"
        aria-label="Пароль"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="ui-field"
      />
      <button
        type="submit"
        disabled={loading}
        className="ui-btn-primary w-full"
      >
        {loading ? 'Входим...' : 'Войти'}
      </button>
      <p className="text-center text-sm text-ink-muted">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitch} className="font-medium text-ink underline underline-offset-4">
          Зарегистрироваться
        </button>
      </p>
    </form>
  )
}