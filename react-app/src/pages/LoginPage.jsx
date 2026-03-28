import { useEffect, useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [clock, setClock] = useState(() => new Date())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Error al iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="centered">
      <div className="login-container">
        <div className="scanline-overlay" aria-hidden />

        <header className="terminal-header">
          <h1>TERMINAL_ACCESS</h1>
          <div style={{ fontSize: 10, color: 'var(--secondary)', marginTop: 5 }}>
            DATE: {clock.toLocaleString('es-ES').toUpperCase()}
          </div>
        </header>

        <div className="project-info">
          <strong>_SYSTEM_OVERVIEW:</strong>
          <br />
          Esta es una plataforma experimental de mensajería y geolocalización con estética retro
          IBM-3270.
          <br />
          <br />
          <strong>_AVISO_IMPORTANTE:</strong>
          <br />
          Versión de <strong>PRUEBA (V2.0)</strong>. Este entorno se utiliza para tests de
          comunicación y mapeo de usuaries en tiempo real.
        </div>

        <div className="auth-prompt">USER_AUTHENTICATION_REQUIRED</div>

        <div className="login-box">
          <button
            type="button"
            className="btn google"
            onClick={handleGoogle}
            disabled={busy}
          >
            <LogIn width={18} height={18} aria-hidden />
            ACCEDER_CON_GOOGLE
          </button>
        </div>

        {error ? (
          <p className="warning-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="warning-text">
          [ ADVERTENCIA: TODA LA ACTIVIDAD ESTÁ SIENDO MONITOREADA ]
        </div>
      </div>
    </main>
  )
}
