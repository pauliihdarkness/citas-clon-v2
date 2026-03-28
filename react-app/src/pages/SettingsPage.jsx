import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { ChevronLeft } from 'lucide-react'
import { MyProfileSettings } from '../components/profile/MyProfileSettings'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'

const EMPTY_SETTINGS = {}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [phase, setPhase] = useState('loading')

  const load = useCallback(async () => {
    if (!user?.uid) return
    setPhase('loading')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists()) {
        setPhase('missing')
        return
      }
      setData(snap.data())
      setPhase('ready')
    } catch (e) {
      console.error('[SETTINGS_PAGE]', e)
      setPhase('error')
    }
  }, [user?.uid])

  useEffect(() => {
    load()
  }, [load])

  async function handleLogout() {
    if (!confirm('¿Deseas cerrar tu sesión actual?')) return
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (e) {
      alert(`Error: ${e?.message || e}`)
    }
  }

  if (phase === 'loading') {
    return (
      <main className="container centered">
        <p className="loading">Accediendo a la configuración del sistema...</p>
      </main>
    )
  }

  return (
    <main className="container">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          borderBottom: '2px solid var(--border)',
          paddingBottom: 15,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="btn-small"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronLeft size={16} /> [ VOLVER ]
        </button>
        <h2 style={{ margin: 0, fontSize: 18, textTransform: 'uppercase' }}>Configuración</h2>
      </header>

      {phase === 'ready' ? (
        <MyProfileSettings
          userId={user.uid}
          isPremium={!!data?.membresia}
          settings={data?.settings ?? EMPTY_SETTINGS}
          onLogout={handleLogout}
        />
      ) : (
        <p className="error">Error al cargar los parámetros del sistema.</p>
      )}
    </main>
  )
}
