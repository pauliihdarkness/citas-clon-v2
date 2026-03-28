import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { Edit3, Settings } from 'lucide-react'
import { ProfileDetails } from '../components/profile/ProfileDetails'
import { ProfileLikesGiven } from '../components/profile/ProfileLikesGiven'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'

export function MyProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [phase, setPhase] = useState('loading')

  const load = useCallback(async () => {
    if (!user?.uid) return
    setPhase('loading')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists()) {
        setData(null)
        setPhase('missing')
        return
      }
      const row = snap.data()
      setData(row)
      if (row.alias) localStorage.setItem('alias', row.alias)
      setPhase('ready')
    } catch (e) {
      console.error(e)
      setPhase('error')
    }
  }, [user?.uid])

  useEffect(() => {
    load()
  }, [load])

  let body
  if (phase === 'loading') {
    body = <p className="loading">Cargando tu perfil...</p>
  } else if (phase === 'missing') {
    body = (
      <div
        className="error-box"
        style={{
          border: '2px dashed var(--error)',
          padding: 20,
          textAlign: 'center',
          background: 'rgba(255,60,0,0.06)',
        }}
      >
        <p>No se encontró información de perfil vinculada a esta cuenta.</p>
        <Link to="/create-profile" className="btn">
          Crear Perfil Ahora
        </Link>
      </div>
    )
  } else if (phase === 'error') {
    body = <p className="error">Error de sistema al cargar el perfil.</p>
  } else {
    body = (
      <>
        <ProfileDetails
          data={data}
          distance={0}
          hideStatus={true}
          hideDistance={true}
          rightActions={
            <>
              <button
                type="button"
                className="btn-hud-icon"
                onClick={() => navigate('/profile/settings')}
                title="Ajustes"
              >
                <Settings size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="btn-hud-icon"
                onClick={() => navigate('/create-profile')}
                title="Editar Perfil"
              >
                <Edit3 size={18} aria-hidden />
              </button>
            </>
          }
        />
        <ProfileLikesGiven userId={user.uid} />
      </>
    )
  }

  return (
    <main className="container">
      <section className="profile-section">
        <div
          id="profile-capture-area"
          style={{ background: 'var(--bg)', borderRadius: 12, padding: 4 }}
        >
          <div id="profile-content" className="profile-card">
            {body}
          </div>
        </div>

      </section>
    </main>
  )
}
