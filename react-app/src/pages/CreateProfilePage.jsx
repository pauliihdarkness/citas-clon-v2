import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { geoManager } from '../../../assets/js/geo-manager.js'
import './create-profile.css'

const DEFAULT_AVATAR =
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-01.png'

const AVATAR_URLS = [
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-01.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-02.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-03.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-04.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-05.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-06.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-07.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-08.png',
  'https://raw.githubusercontent.com/pauliihdarkness/citas-clon-v2/main/assets/img/avatar-09.png',
]

const ANIMALES = ['Michis', 'Perris', 'Gallinitas', 'Patos', 'Conejos', 'Otros']

function detectPlatform() {
  const p = (navigator.platform || '').toLowerCase()
  if (p.includes('win')) return 'windows'
  if (p.includes('mac')) return 'macos'
  if (p.includes('iphone')) return 'ios'
  return 'linux/android'
}

function normalizeCoords(currentCoords) {
  if (!currentCoords) return null
  if (Array.isArray(currentCoords)) {
    return [parseFloat(currentCoords[0]), parseFloat(currentCoords[1])]
  }
  if (currentCoords.latitude && currentCoords.longitude) {
    return [parseFloat(currentCoords.latitude), parseFloat(currentCoords.longitude)]
  }
  if (currentCoords.lat && (currentCoords.lng || currentCoords.lon)) {
    return [parseFloat(currentCoords.lat), parseFloat(currentCoords.lng || currentCoords.lon)]
  }
  return null
}

const emptyForm = {
  alias: '',
  edad: '',
  fotoPerfilUrl: '',
  busqueda: '',
  link: '',
  orientacion: '',
  salud: '',
  soledad: '',
  torta: '',
  pais: '',
  provincia: '',
  ciudad: '',
  departamento: '',
  columna: '',
}

export function CreateProfilePage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [animales, setAnimales] = useState(new Set())
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(null)
  const [currentCoords, setCurrentCoords] = useState(null)
  const [geoQuery, setGeoQuery] = useState('')
  const [geoResults, setGeoResults] = useState([])
  const [geoOpen, setGeoOpen] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [locFlash, setLocFlash] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadDone, setLoadDone] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [photoBroken, setPhotoBroken] = useState(false)

  const geoBoxRef = useRef(null)

  const setField = useCallback((name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
  }, [])

  useEffect(() => {
    function onDocClick(e) {
      if (geoBoxRef.current && !geoBoxRef.current.contains(e.target)) {
        setGeoOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (cancelled || !snap.exists()) {
          setIsEditMode(false)
          setLoadDone(true)
          return
        }
        setIsEditMode(true)
        const data = snap.data()
        setForm({
          alias: data.alias || '',
          edad: data.edad != null ? String(data.edad) : '',
          fotoPerfilUrl: data.fotoPerfilUrl || '',
          busqueda: data.busqueda || '',
          link: data.link || '',
          orientacion: data.orientacion || '',
          salud: data.salud || '',
          soledad: data.soledad || '',
          torta: data.torta || '',
          pais: data.pais || '',
          provincia: data.provincia || '',
          ciudad: data.ciudad || '',
          departamento: data.departamento || '',
          columna: data.columna || '',
        })
        if (data.animales && Array.isArray(data.animales)) {
          setAnimales(new Set(data.animales))
        }
        if (data.coords) setCurrentCoords(data.coords)
        setPhotoBroken(false)
        if (data.fotoPerfilUrl) {
          const match = AVATAR_URLS.includes(data.fotoPerfilUrl)
          setSelectedAvatarUrl(match ? data.fotoPerfilUrl : null)
        }
        if (data.alias) localStorage.setItem('alias', data.alias)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadDone(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  async function performGeoSearch() {
    if (!geoQuery.trim()) return
    setGeoBusy(true)
    setGeoOpen(true)
    setGeoResults([])
    try {
      const results = await geoManager.searchLocation(geoQuery)
      setGeoResults(results)
      if (results.length === 0) {
        setGeoResults([])
      }
    } catch (e) {
      console.error(e)
      setGeoResults([])
    } finally {
      setGeoBusy(false)
    }
  }

  function applyGeoResult(r) {
    setForm((f) => ({
      ...f,
      pais: r.pais || '',
      provincia: r.provincia || '',
      ciudad: r.ciudad || '',
      departamento: r.departamento || '',
      columna: r.columna || '',
    }))
    setCurrentCoords(r.coords)
    setGeoQuery(r.display_name || '')
    setGeoOpen(false)
    setLocFlash(true)
    setTimeout(() => setLocFlash(false), 2000)
  }

  function toggleAnimal(val) {
    setAnimales((prev) => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  function onPickAvatar(url) {
    setPhotoBroken(false)
    setSelectedAvatarUrl(url)
    setForm((f) => ({ ...f, fotoPerfilUrl: url }))
  }

  function onFotoInput(v) {
    setPhotoBroken(false)
    setSelectedAvatarUrl(null)
    setForm((f) => ({ ...f, fotoPerfilUrl: v }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!user) {
      setFeedback({ type: 'error', text: 'Usuario no autenticado.' })
      return
    }
    if (!form.orientacion) {
      setFeedback({ type: 'error', text: 'Seleccioná una orientación.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    const finalCoords = normalizeCoords(currentCoords)
    const edadNum = parseInt(form.edad, 10)

    try {
      if (isEditMode) {
        // --- MODO EDICIÓN: Solo campos mutables del formulario ---
        const updatePayload = {
          alias: form.alias.trim(),
          edad: Number.isNaN(edadNum) ? null : edadNum,
          fotoPerfilUrl: form.fotoPerfilUrl.trim() || DEFAULT_AVATAR,
          busqueda: form.busqueda,
          link: form.link,
          orientacion: form.orientacion,
          animales: Array.from(animales),
          salud: form.salud,
          soledad: form.soledad,
          torta: form.torta,
          pais: form.pais,
          provincia: form.provincia,
          ciudad: form.ciudad,
          departamento: form.departamento,
          columna: form.columna,
          coords: finalCoords,
          lastSeen: serverTimestamp(),
          platform: detectPlatform(),
        }
        await updateDoc(doc(db, 'users', user.uid), updatePayload)
      } else {
        // --- MODO CREACIÓN: Definir todos los campos iniciales ---
        const profileData = {
          authUid: user.uid,
          alias: form.alias.trim(),
          edad: Number.isNaN(edadNum) ? null : edadNum,
          fotoPerfilUrl: form.fotoPerfilUrl.trim() || DEFAULT_AVATAR,
          busqueda: form.busqueda,
          link: form.link,
          orientacion: form.orientacion,
          animales: Array.from(animales),
          salud: form.salud,
          soledad: form.soledad,
          torta: form.torta,
          pais: form.pais,
          provincia: form.provincia,
          ciudad: form.ciudad,
          departamento: form.departamento,
          columna: form.columna,
          coords: finalCoords,
          creadoEn: serverTimestamp(),
          isOnline: true,
          lastSeen: serverTimestamp(),
          likeCount: 0,
          mensajesEnviados: 0,
          fcmToken: '',
          platform: detectPlatform(),
        }
        await setDoc(doc(db, 'users', user.uid), profileData)
      }

      localStorage.setItem('alias', form.alias.trim())
      await refreshProfile()
      setFeedback({ type: 'success', text: 'PERFIL_INICIALIZADO_CON_ÉXITO' })
      setTimeout(() => navigate('/profile', { replace: true }), 900)
    } catch (err) {
      console.error(err)
      setFeedback({
        type: 'error',
        text: err?.message ? `Error: ${err.message}` : 'Error al guardar el perfil.',
      })
    } finally {
      setSaving(false)
    }
  }

  const busquedaLen = form.busqueda.length

  return (
    <main className="container">
      <div className="create-profile-container">
        <header className="form-header">
          <h1>_INICIALIZAR_PERFIL</h1>
          <p className="helper-text">INGRESE SUS DATOS PARA COMENZAR EN LA RED</p>
        </header>

        {feedback ? (
          <div className={`create-profile-flash ${feedback.type}`}>{feedback.text}</div>
        ) : null}

        <form className="profile-form" onSubmit={onSubmit}>
          <div className="form-section">
            <h2 style={{ fontSize: 14, borderBottom: '1px solid var(--border)', marginBottom: 15 }}>
              [ DATOS_BASICOS ]
            </h2>
            <div className="grid-2">
              <div className="filter-group">
                <label htmlFor="alias">alias:</label>
                <input
                  id="alias"
                  value={form.alias}
                  onChange={(e) => setField('alias', e.target.value)}
                  placeholder="Claudia"
                  required
                />
              </div>
              <div className="filter-group">
                <label htmlFor="edad">edad (18-99):</label>
                <input
                  id="edad"
                  type="number"
                  min={18}
                  max={99}
                  value={form.edad}
                  onChange={(e) => setField('edad', e.target.value)}
                  placeholder="52"
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 25 }}>
            <h2 style={{ fontSize: 14, borderBottom: '1px solid var(--border)', marginBottom: 15 }}>
              [ IDENTIDAD_VISUAL ]
            </h2>
            <div className="photo-upload-container">
              <div className="photo-preview">
                {form.fotoPerfilUrl?.trim() && !photoBroken ? (
                  <img src={form.fotoPerfilUrl} alt="" onError={() => setPhotoBroken(true)} />
                ) : (
                  <User size={40} aria-hidden />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="fotoPerfilUrl">fotoPerfilUrl:</label>
                <input
                  id="fotoPerfilUrl"
                  value={form.fotoPerfilUrl}
                  onChange={(e) => onFotoInput(e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', marginBottom: 8 }}
                />
              </div>
            </div>
            <div className="avatar-selection-title">[ SELECCIONAR_AVATAR_PREDEFINIDO ]</div>
            <div className="avatar-grid">
              {AVATAR_URLS.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`Avatar ${i + 1}`}
                  className={`avatar-item${selectedAvatarUrl === url ? ' selected' : ''}`}
                  onClick={() => onPickAvatar(url)}
                />
              ))}
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 25 }}>
            <h2 style={{ fontSize: 14, borderBottom: '1px solid var(--border)', marginBottom: 15 }}>
              [ PRESENTACION_Y_REDES ]
            </h2>
            <div className="filter-group">
              <label htmlFor="busqueda">busqueda:</label>
              <textarea
                id="busqueda"
                className="textarea-retro"
                maxLength={500}
                value={form.busqueda}
                onChange={(e) => setField('busqueda', e.target.value)}
                placeholder="¿Qué estás buscando? (Ej: Conocer gente nueva, amistades...)"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <span className="helper-text" style={{ fontSize: 9, opacity: 0.7 }}>
                  * MÁXIMO 500 CARACTERES PERMITIDOS.
                </span>
                <span
                  id="busqueda-counter"
                  style={{
                    fontSize: 10,
                    color: busquedaLen >= 450 ? 'var(--error)' : 'var(--secondary)',
                  }}
                >
                  {busquedaLen} / 500
                </span>
              </div>
            </div>
            <div className="filter-group" style={{ marginTop: 15 }}>
              <label htmlFor="link">instagram / username:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,176,0,0.03)', border: '1px solid var(--border)', padding: '0 10px' }}>
                <span style={{ fontSize: 11, color: 'var(--secondary)', opacity: 0.8, userSelect: 'none' }}>instagram.com/</span>
                <input
                  id="link"
                  value={form.link}
                  onChange={(e) => setField('link', e.target.value)}
                  placeholder="pau_darkness"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 0', color: 'var(--text)' }}
                />
              </div>
              <p className="helper-text" style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>* INGRESA SOLO TU NOMBRE DE USUARIO SIN EL '@'.</p>
            </div>
          </div>

          <div className="form-section">
            <h2
              style={{
                fontSize: 14,
                borderBottom: '1px solid var(--border)',
                marginBottom: 15,
                marginTop: 25,
              }}
            >
              [ PREFERENCIAS_Y_FILTROS ]
            </h2>
            <div className="grid-2">
              <div className="filter-group">
                <label htmlFor="orientacion">orientacion:</label>
                <select
                  id="orientacion"
                  className="select-retro"
                  required
                  value={form.orientacion}
                  onChange={(e) => setField('orientacion', e.target.value)}
                >
                  <option value="" disabled>
                    -- SELECCIONAR_ORIENTACION --
                  </option>
                  <option value="Lesbiana">[ LESBIANA ]</option>
                  <option value="Bisexual">[ BISEXUAL ]</option>
                  <option value="Pansexual">[ PANSEXUAL ]</option>
                  <option value="Asexual">[ ASEXUAL ]</option>
                  <option value="Demisexual">[ DEMISEXUAL ]</option>
                  <option value="Queer">[ QUEER ]</option>
                  <option value="Sáfica">[ SÁFICA ]</option>
                  <option value="Heterosexual">[ HETEROSEXUAL ]</option>
                  <option value="En proceso de exploración">[ EN_PROCESO_DE_EXPLORACION ]</option>
                  <option value="Prefiero no decirlo">[ PREFIERO_NO_DECIRLO ]</option>
                </select>
              </div>
            </div>
            <div className="filters-grid" style={{ marginTop: 10, display: 'grid', gap: 15 }}>
              <div className="filter-group">
                <label>ageFilterMin:</label>
                <input type="number" value={18} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
              </div>
              <div className="filter-group">
                <label>ageFilterMax:</label>
                <input type="number" value={99} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
              </div>
            </div>
            <p className="helper-text" style={{ fontSize: 9, marginTop: 8, opacity: 0.7 }}>
              * LOS FILTROS DE EDAD ESTÁN DESHABILITADOS POR DEFECTO (18-99).
            </p>
          </div>

          <div className="form-section">
            <h2
              style={{
                fontSize: 14,
                borderBottom: '1px solid var(--border)',
                marginBottom: 15,
                marginTop: 25,
              }}
            >
              [ DETALLES_PERSONALES ]
            </h2>
            <div className="filter-group">
              <label>animales:</label>
              <div className="checkbox-grid">
                {ANIMALES.map((a) => (
                  <label key={a} className="custom-checkbox">
                    <input
                      type="checkbox"
                      checked={animales.has(a)}
                      onChange={() => toggleAnimal(a)}
                    />
                    {a === 'Michis' && '[ MICHIS 🐱 ]'}
                    {a === 'Perris' && '[ PERRIS 🐶 ]'}
                    {a === 'Gallinitas' && '[ GALLINITAS 🐔 ]'}
                    {a === 'Patos' && '[ PATOS 🦆 ]'}
                    {a === 'Conejos' && '[ CONEJOS 🐰 ]'}
                    {a === 'Otros' && '[ OTROS ]'}
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group" style={{ marginTop: 15 }}>
              <label htmlFor="salud">salud:</label>
              <select
                id="salud"
                className="select-retro"
                value={form.salud}
                onChange={(e) => setField('salud', e.target.value)}
              >
                <option value="">-- SELECCIONAR_NIVEL --</option>
                <option value="Excelente">[ EXCELENTE ]</option>
                <option value="Estable">[ ESTABLE ]</option>
                <option value="En tratamiento">[ EN_TRATAMIENTO ]</option>
                <option value="Reservado">[ RESERVADO ]</option>
              </select>
            </div>
            <div className="filter-group" style={{ marginTop: 15 }}>
              <label htmlFor="soledad">soledad:</label>
              <select
                id="soledad"
                className="select-retro"
                value={form.soledad}
                onChange={(e) => setField('soledad', e.target.value)}
              >
                <option value="">-- SELECCIONAR_AVANZADO --</option>
                <option value="Disfruto mi tiempo a solas">[ DISFRUTO_MI_TIEMPO_A_SOLAS ]</option>
                <option value="Busco compañía constante">[ BUSCO_COMPAÑIA_CONSTANTE ]</option>
                <option value="Depende del día">[ DEPENDE_DEL_DIA ]</option>
                <option value="Abierta a nuevas conexiones">[ ABIERTA_A_NUEVAS_CONEXIONES ]</option>
              </select>
            </div>
            <div className="filter-group" style={{ marginTop: 15 }}>
              <label htmlFor="torta">torta:</label>
              <select
                id="torta"
                className="select-retro"
                value={form.torta}
                onChange={(e) => setField('torta', e.target.value)}
              >
                <option value="">-- SELECCIONAR_SABOR --</option>
                <option value="Vainilla">[ VAINILLA ]</option>
                <option value="Chocolate">[ CHOCOLATE ]</option>
                <option value="Frutilla">[ FRUTILLA ]</option>
                <option value="Mixta">[ MIXTA ]</option>
                <option value="Red Velvet">[ RED_VELVET ]</option>
                <option value="Sin_Azucar">[ SIN_AZUCAR ]</option>
                <option value="Limón">[ LIMÓN ]</option>
                <option value="Chocotorta">[ CHOCOTORTA ]</option>
                <option value="Dulce_de_Leche">[ DULCE_DE_LECHE ]</option>
                <option value="Cheesecake">[ CHEESECAKE ]</option>
                <option value="Tiramisú">[ TIRAMISÚ ]</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h2
              style={{
                fontSize: 14,
                borderBottom: `1px solid var(--border)`,
                marginBottom: 15,
                marginTop: 25,
                color: locFlash ? 'var(--accent)' : undefined,
              }}
            >
              [ UBICACIÓN ]
            </h2>
            <div ref={geoBoxRef} className="location-search-box" style={{ marginBottom: 20 }}>
              <label
                style={{ color: 'var(--accent)', fontSize: 10, display: 'block', marginBottom: 5 }}
              >
                _BUSQUEDA_RAPIDA (API):
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      performGeoSearch()
                    }
                  }}
                  placeholder="Ej: Posadas, Misiones, Argentina"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-small" disabled={geoBusy} onClick={performGeoSearch}>
                  {geoBusy ? '[ ... ]' : '[ BUSCAR ]'}
                </button>
              </div>
              {geoOpen ? (
                <div
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    marginTop: 5,
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontSize: 11,
                  }}
                >
                  {geoBusy ? <div style={{ padding: 10 }}>Buscando en satélites...</div> : null}
                  {!geoBusy && geoResults.length === 0 ? (
                    <div style={{ padding: 10 }}>No se encontraron coordenadas.</div>
                  ) : null}
                  {!geoBusy &&
                    geoResults.map((r, i) => (
                    <button
                      key={`${r.display_name}-${i}`}
                      type="button"
                      className="geo-result-item"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,176,0,0.2)',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                      onClick={() => applyGeoResult(r)}
                    >
                      {r.display_name}
                    </button>
                    ))}
                </div>
              ) : null}
              <p className="helper-text" style={{ fontSize: 9, marginTop: 8, opacity: 0.7 }}>
                * LOS CAMPOS SE COMPLETARÁN AUTOMÁTICAMENTE AL SELECCIONAR UN RESULTADO.
              </p>
            </div>
            <div className="grid-3" style={{ marginBottom: 10 }}>
              <div className="filter-group">
                <label htmlFor="pais">pais:</label>
                <input
                  id="pais"
                  value={form.pais}
                  onChange={(e) => setField('pais', e.target.value)}
                  placeholder="Argentina"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="provincia">provincia:</label>
                <input
                  id="provincia"
                  value={form.provincia}
                  onChange={(e) => setField('provincia', e.target.value)}
                  placeholder="Misiones"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="ciudad">ciudad:</label>
                <input
                  id="ciudad"
                  value={form.ciudad}
                  onChange={(e) => setField('ciudad', e.target.value)}
                  placeholder="Posadas"
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="filter-group">
                <label htmlFor="departamento">departamento:</label>
                <input
                  id="departamento"
                  value={form.departamento}
                  onChange={(e) => setField('departamento', e.target.value)}
                  placeholder="Capital"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="columna">barrio / columna:</label>
                <input
                  id="columna"
                  value={form.columna}
                  onChange={(e) => setField('columna', e.target.value)}
                  placeholder="Palermo"
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="btn"
              style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
              onClick={() => navigate(-1)}
            >
              [ CANCELAR ]
            </button>
            <button type="submit" className="btn" disabled={saving || !loadDone}>
              {saving ? '[ GUARDANDO... ]' : (isEditMode ? '[ ACTUALIZAR_PERFIL ]' : '[ GUARDAR_PERFIL ]')}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
