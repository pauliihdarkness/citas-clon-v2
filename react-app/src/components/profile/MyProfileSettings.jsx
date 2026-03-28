import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { Settings } from 'lucide-react'
import { db } from '../../lib/firebase'

export function MyProfileSettings({ userId, isPremium, settings = {}, onLogout }) {
  const [incognito, setIncognito] = useState(false)
  const [showOnline, setShowOnline] = useState(true)
  const [scanlines, setScanlines] = useState(true)
  const [sounds, setSounds] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isPremium) {
      setIncognito(false)
    } else {
      setIncognito(!!settings.incognito)
    }
    setShowOnline(settings.showOnline !== false)
    setSounds(!!settings.sounds)

    const fromLs = localStorage.getItem('scanlines_enabled')
    if (fromLs !== null) {
      setScanlines(fromLs === 'true')
    } else {
      setScanlines(settings.scanlines !== false)
    }
    setReady(true)
  }, [userId, isPremium, settings])

  useEffect(() => {
    if (!ready) return
    if (scanlines) {
      document.body.classList.remove('no-scanlines')
    } else {
      document.body.classList.add('no-scanlines')
    }
  }, [scanlines, ready])

  async function persist(key, value) {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, { [`settings.${key}`]: value })
    } catch (e) {
      console.error('[SETTINGS]', e)
    }
  }

  function onIncognitoChange(checked) {
    if (!isPremium) {
      alert('Esta función requiere membresía ★ PREMIUM')
      setIncognito(false)
      return
    }
    setIncognito(checked)
    persist('incognito', checked)
  }

  async function onShowOnlineChange(checked) {
    setShowOnline(checked)
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        'settings.showOnline': checked,
        isOnline: checked,
      })
    } catch (e) {
      console.error('[SETTINGS]', e)
    }
  }

  function onScanlinesChange(checked) {
    setScanlines(checked)
    localStorage.setItem('scanlines_enabled', String(checked))
    persist('scanlines', checked)
  }

  function onSoundsChange(checked) {
    setSounds(checked)
    persist('sounds', checked)
  }

  return (
    <div id="settings-panel" className="settings-panel">
      <header className="settings-header">
        <Settings size={16} color="var(--accent)" aria-hidden />
        <h3>[ AJUSTES_DEL_SISTEMA ]</h3>
      </header>

      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">
              Modo Incógnito
              {!isPremium ? (
                <span style={{ color: 'var(--accent)', fontSize: 9, marginLeft: 5 }}>[ ★ PREMIUM ]</span>
              ) : null}
            </span>
            <span className="setting-desc">Ocultar mi ubicación del mapa global</span>
          </div>
          <label className="retro-switch">
            <input
              type="checkbox"
              checked={incognito}
              disabled={!isPremium}
              onChange={(e) => onIncognitoChange(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Estado Online</span>
            <span className="setting-desc">Mostrar cuándo estoy activo</span>
          </div>
          <label className="retro-switch">
            <input
              type="checkbox"
              checked={showOnline}
              onChange={(e) => onShowOnlineChange(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div style={{ borderTop: '1px dashed rgba(255,176,0,0.1)', margin: '8px 0', paddingTop: 8 }}>
          <p style={{ fontSize: 9, color: 'var(--accent)', marginBottom: 8 }}>// INTERFAZ_Y_VISUALES</p>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Efecto CRT (Scanlines)</span>
            <span className="setting-desc">Activar líneas de escaneo decorativas</span>
          </div>
          <label className="retro-switch">
            <input
              type="checkbox"
              checked={scanlines}
              onChange={(e) => onScanlinesChange(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Efectos de Sonido</span>
            <span className="setting-desc">Sonidos de terminal al interactuar</span>
          </div>
          <label className="retro-switch">
            <input type="checkbox" checked={sounds} onChange={(e) => onSoundsChange(e.target.checked)} />
            <span className="slider" />
          </label>
        </div>

        <div
          className="setting-item"
          style={{
            borderTop: '1px dashed rgba(255,176,0,0.1)',
            marginTop: 12,
            paddingTop: 12,
            borderBottom: 'none',
          }}
        >
          <div className="setting-info">
            <span className="setting-label" style={{ color: '#ff3e3e' }}>
              Seguridad de la Cuenta
            </span>
            <span className="setting-desc">Cerrar sesión en este dispositivo</span>
          </div>
          <button
            id="logout-btn-config"
            type="button"
            className="btn logout"
            style={{ padding: '6px 12px', fontSize: 10, width: 'auto' }}
            onClick={onLogout}
          >
            [ SALIR ]
          </button>
        </div>
      </div>
    </div>
  )
}
