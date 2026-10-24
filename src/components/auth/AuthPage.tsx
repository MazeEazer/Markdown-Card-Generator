import { useEffect, useRef, useState } from 'react'
import { saveStartIntent, type StartIntent } from '../../lib/startIntent'
import { AppHeader } from '../home/AppHeader'
import { Hero } from '../home/Hero'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'

/** До входа: первый экран, под ним — вход и регистрация. Кнопки первого экрана ведут к форме и запоминают выбор. */
export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const authRef = useRef<HTMLElement>(null)
  // Фокус — после смены вкладки: форма регистрации появляется только на следующей отрисовке
  const [focusRequest, setFocusRequest] = useState(0)

  useEffect(() => {
    if (focusRequest) authRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [focusRequest])

  const toAuth = (intent?: StartIntent) => {
    if (intent) {
      saveStartIntent(intent)
      // Новичку с кнопкой создания нужнее регистрация, чем вход
      setMode('signup')
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    authRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setFocusRequest((n) => n + 1)
  }

  return (
    <div className="ui-page">
      <AppHeader>
        <button onClick={() => { setMode('login'); toAuth() }} className="ui-btn-secondary px-3 py-1.5">Войти</button>
      </AppHeader>

      <Hero onAi={() => toAuth('ai')} onTemplate={() => toAuth('template')} />

      <section ref={authRef} id="auth" className="scroll-mt-14 px-4 py-16 sm:px-6 sm:py-24" aria-label="Вход и регистрация">
        <div className="ui-panel mx-auto w-full max-w-sm p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-md border border-line p-1 text-sm" role="tablist" aria-label="Вход или регистрация">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => setMode(tab)}
                className={`rounded py-1.5 font-medium transition-colors ${mode === tab ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}
              >
                {tab === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>
          {mode === 'login' ? <LoginForm onSwitch={() => setMode('signup')} /> : <SignUpForm onSwitch={() => setMode('login')} />}
        </div>
      </section>
    </div>
  )
}
