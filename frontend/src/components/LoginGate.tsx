import { KeyRound, Lock, ShieldAlert } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Brand } from './Brand'

const PANEL_AUTH_KEY = 'nexofin:panel-auth'

// Credenciales fijas para la demo: no hay requisito de login real (no es
// parte de los criterios del track), solo de que el pipeline interno de
// leads no quede visible para cualquiera que abra la app. Se pueden
// sobrescribir con variables de entorno para no dejarlas hardcodeadas en
// el bundle en un despliegue real.
const PANEL_USER = import.meta.env.VITE_PANEL_USER || 'equipo'
const PANEL_PASSWORD = import.meta.env.VITE_PANEL_PASSWORD || 'nexofin2026'

export function isPanelUnlocked(): boolean {
  return sessionStorage.getItem(PANEL_AUTH_KEY) === 'true'
}

export function lockPanel() {
  sessionStorage.removeItem(PANEL_AUTH_KEY)
}

interface LoginGateProps {
  onUnlock: () => void
}

export function LoginGate({ onUnlock }: LoginGateProps) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (user.trim() === PANEL_USER && password === PANEL_PASSWORD) {
      sessionStorage.setItem(PANEL_AUTH_KEY, 'true')
      setError('')
      onUnlock()
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="login-gate">
      <div className="login-gate__card">
        <Brand />
        <div className="login-gate__badge"><Lock size={22} /></div>
        <h1>Panel interno</h1>
        <p>Acceso restringido al equipo comercial. Aquí viven el pipeline de leads y la cola de revisión humana.</p>

        <form className="login-gate__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuario</span>
            <div className="field__control">
              <KeyRound size={16} />
              <input value={user} onChange={(event) => setUser(event.target.value)} autoFocus autoComplete="username" />
            </div>
          </label>
          <label className="field">
            <span>Contraseña</span>
            <div className="field__control">
              <Lock size={16} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
          </label>

          {error && (
            <div className="inline-error" role="alert"><ShieldAlert size={16} /> {error}</div>
          )}

          <button className="button button--primary button--full" type="submit">Entrar al panel</button>
        </form>
      </div>
    </div>
  )
}
