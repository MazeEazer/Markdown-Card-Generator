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
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Проверьте почту</h2>
        <p className="text-ink-muted">
          Мы отправили ссылку для подтверждения на <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200" role="alert">
          {error}
        </div>
      )}
      <input
        type="text"
        placeholder="Имя"
        aria-label="Имя"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        required
        className="ui-field"
      />
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
        placeholder="Пароль (мин. 6 символов)"
        aria-label="Пароль (мин. 6 символов)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        className="ui-field"
      />
      <button
        type="submit"
        disabled={loading}
        className="ui-btn-primary w-full"
      >
        {loading ? 'Регистрируемся...' : 'Зарегистрироваться'}
      </button>
      <p className="text-center text-sm text-ink-muted">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={onSwitch} className="font-medium text-ink underline underline-offset-4">
          Войти
        </button>
      </p>
    </form>
  )
}