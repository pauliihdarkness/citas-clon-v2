import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, MessageCircle } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { ProfileDetails } from '../components/profile/ProfileDetails'
import { ProfileLikesGiven } from '../components/profile/ProfileLikesGiven'
import { ProfileMapSection } from '../components/profile/ProfileMapSection'
import { useAuth } from '../context/AuthContext'
import { fetchUserProfile } from '../lib/fetchUserProfile'
import { db } from '../lib/firebase'
import { haversineKm, resolveCoords } from '../lib/profileMapUtils'

export function UserPublicPage() {
  const { userId: rawParam } = useParams()
  const userId = rawParam ? decodeURIComponent(rawParam) : ''
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const captureRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [captureBusy, setCaptureBusy] = useState(false)
  const [distKm, setDistKm] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setPhase('missing')
      return undefined
    }
    setPhase('loading')
    ;(async () => {
      try {
        const result = await fetchUserProfile(userId)
        if (cancelled) return
        if (!result) {
          setProfile(null)
          setPhase('notfound')
          return
        }
        setProfile(result)
        setPhase('ready')

        // Calcular distancia para el badge del header
        if (currentUser && result.data) {
          const viewedRes = resolveCoords(result.data)
          const myDocSnap = await getDoc(doc(db, 'users', currentUser.uid))
          if (myDocSnap.exists()) {
            const myRes = resolveCoords(myDocSnap.data())
            if (viewedRes && myRes) {
              const d = haversineKm(myRes.coords[0], myRes.coords[1], viewedRes.coords[0], viewedRes.coords[1])
              setDistKm(d)
            }
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, currentUser])

  const goMessage = useCallback(() => {
    if (!profile?.data?.alias) {
      alert('Este usuario no tiene un alias, no se puede iniciar chat.')
      return
    }
    navigate(`/inbox?with=${encodeURIComponent(profile.data.alias)}`)
  }, [navigate, profile])

  async function captureProfile() {
    const container = captureRef.current
    if (!container) return
    setCaptureBusy(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(container, {
        useCORS: true,
        scale: 2,
        logging: false,
      })
      await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('blob'))
            return
          }
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `perfil_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
          resolve()
        }, 'image/png')
      })
    } catch (e) {
      console.error(e)
      alert('Error al capturar el perfil. Revisa la consola.')
    } finally {
      setCaptureBusy(false)
    }
  }

  let body
  if (phase === 'missing') {
    body = <p className="error">ID de usuario no especificado</p>
  } else if (phase === 'loading') {
    body = <p className="loading">Cargando perfil...</p>
  } else if (phase === 'notfound') {
    body = <p className="error">Usuario no encontrado</p>
  } else if (phase === 'error') {
    body = <p className="error">Error al cargar el perfil.</p>
  } else {
    body = (
      <>
        <ProfileDetails
          data={profile.data}
          distance={distKm}
          leftActions={
            <button
              type="button"
              className="btn-hud-icon"
              onClick={() => navigate(-1)}
              title="Volver"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
          }
          rightActions={
            <>
              <button
                type="button"
                className="btn-hud-icon"
                onClick={goMessage}
                title="Enviar Mensaje"
              >
                <MessageCircle size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="btn-hud-icon"
                disabled={captureBusy}
                onClick={captureProfile}
                title="Capturar Perfil"
              >
                <Camera size={18} aria-hidden />
              </button>
            </>
          }
        />
        <ProfileLikesGiven userId={profile.id} />
      </>
    )
  }

  return (
    <main className="container">
      <section className="profile-section">
        <div
          ref={captureRef}
          id="profile-capture-area"
          style={{ background: 'var(--bg)', borderRadius: 12, padding: 4 }}
        >
          <div id="profile-content" className="profile-card">
            {body}
          </div>
          {phase === 'ready' && profile ? (
            <ProfileMapSection viewedData={profile.data} currentUserUid={currentUser?.uid ?? null} />
          ) : null}
        </div>
      </section>
    </main>
  )
}
