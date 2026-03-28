import { AtSign, Calendar, CircleDot, Coffee, Crown, MapPin, User } from 'lucide-react'
import { ProfileFieldIcon } from './ProfileFieldIcon'
import { getSafeProfileImageUrl } from '../../lib/profileTextUtils'

const FIELD_CONFIG = {
  genero: { label: 'Género', icon: 'user' },
  orientacion: { label: 'Orientación', icon: 'heart' },
  busqueda: { label: 'Lo que busco', icon: 'search' },
  link: { label: 'Instagram', icon: 'instagram' },
  animales: { label: 'Animales', icon: 'dog' },
  salud: { label: 'Salud', icon: 'activity' },
  soledad: { label: 'Estado', icon: 'user-plus' },
  torta: { label: 'Preferencia', icon: 'pie-chart' },
  signo: { label: 'Signo Zod.', icon: 'star' },
  profesion: { label: 'Profesión', icon: 'briefcase' },
  ocupacion: { label: 'Ocupación', icon: 'briefcase' },
  empresa: { label: 'Empresa', icon: 'building' },
  educacion: { label: 'Educación', icon: 'graduation-cap' },
  altura: { label: 'Altura', icon: 'ruler' },
  peso: { label: 'Peso', icon: 'scale' },
  hijos: { label: 'Hijos', icon: 'baby' },
  fuma: { label: 'Fuma', icon: 'cigarette' },
  bebe: { label: 'Bebe', icon: 'wine' },
  relacion: { label: 'Busca', icon: 'heart-handshake' },
  idiomas: { label: 'Idiomas', icon: 'languages' },
}

const FIELD_GROUPS = [
  {
    title: 'Información Personal',
    icon: 'user-check',
    fields: ['genero', 'orientacion', 'signo', 'altura', 'peso'],
  },
  {
    title: 'Carrera y Formación',
    icon: 'briefcase',
    fields: ['profesion', 'ocupacion', 'empresa', 'educacion'],
  },
  {
    title: 'Estilo de Vida',
    icon: 'activity',
    fields: ['relacion', 'hijos', 'fuma', 'bebe', 'idiomas', 'animales', 'salud', 'soledad', 'torta'],
  },
]

const BASE_EXCLUDED = new Set([
  'id',
  'uid',
  'authUid',
  'creadoEn',
  'fotoPerfilUrl',
  'alias',
  'nombre',
  'ciudad',
  'provincia',
  'pais',
  'membresia',
  'isOnline',
  'lastSeen',
  'departamento',
  'columna',
  'biografia',
  'descripcion',
  'intereses',
  'dniUrl',
  'email',
  'edad',
  'coords',
  'fcmToken',
  'platform',
  'link',
  'settings',
  'busqueda',
  'likeCount',
  'mensajesEnviados',
])

function formatValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value ? 'Sí' : null
  if (Array.isArray(value)) {
    const j = value.join(', ')
    return j || null
  }
  if (typeof value === 'object' && value.seconds !== undefined) {
    return new Date(value.seconds * 1000).toLocaleDateString('es-ES')
  }
  if (typeof value === 'object') return null
  return String(value)
}

function OwnDetailRow({ fieldKey, value }) {
  const formatted = formatValue(value)
  if (!formatted) return null
  const cfg = FIELD_CONFIG[fieldKey] || { label: fieldKey, icon: 'hash' }
  return (
    <div className="detail-row">
      <span className="detail-label">
        <ProfileFieldIcon name={cfg.icon} />
        {cfg.label}
      </span>
      <span className="detail-value">{formatted}</span>
    </div>
  )
}

export function ProfileOwnDetails({ data }) {
  const displayName = data.alias || data.nombre || 'Sin nombre'
  const photoURL = getSafeProfileImageUrl(data.fotoPerfilUrl)
  const location =
    [data.ciudad, data.provincia, data.pais].filter(Boolean).join(', ') || 'Ubicación no configurada'

  const excluded = new Set(BASE_EXCLUDED)
  const bio = data.biografia || data.descripcion || data.busqueda

  let creadoLine = null
  if (data.creadoEn) {
    const ms = data.creadoEn.seconds ? data.creadoEn.seconds * 1000 : new Date(data.creadoEn).getTime()
    creadoLine = (
      <p className="profile-created">
        <Calendar size={16} style={{ verticalAlign: 'middle' }} aria-hidden /> Desde:{' '}
        {new Date(ms).toLocaleDateString('es-ES')}
      </p>
    )
  }

  return (
    <>
      <div className="profile-header">
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="profile-photo" />
        ) : (
          <div className="profile-photo-placeholder">
            <User size={48} aria-hidden />
          </div>
        )}
        <div className="profile-info">
          <h2 style={{ color: 'var(--accent)' }}>{displayName}</h2>
          {data.edad ? <p className="profile-age">{data.edad} años</p> : null}
          <p className="profile-location">
            <MapPin size={16} style={{ verticalAlign: 'middle' }} aria-hidden /> {location}
          </p>
          <p className="profile-status">
            <CircleDot size={16} style={{ color: '#0f0', verticalAlign: 'middle' }} aria-hidden /> Tú{' '}
            {data.membresia ? (
              <>
                <Crown size={14} style={{ verticalAlign: 'middle' }} aria-hidden /> Premium
              </>
            ) : (
              <>
                <Coffee size={14} style={{ verticalAlign: 'middle' }} aria-hidden /> Cupcake
              </>
            )}
          </p>
          {creadoLine}
          {data.link ? (
            <p className="profile-link">
              <AtSign size={16} style={{ verticalAlign: 'middle' }} aria-hidden /> Instagram: @{data.link}
            </p>
          ) : null}
        </div>
      </div>

      <div className="profile-details">
        {bio ? (
          <div className="detail-row full-width">
            <span className="detail-label">
              <ProfileFieldIcon name="file-text" />
              Sobre mí / Búsqueda
            </span>
            <span className="detail-value">{bio}</span>
          </div>
        ) : null}

        {data.intereses && Array.isArray(data.intereses) && data.intereses.length > 0 ? (
          <div className="detail-row full-width">
            <span className="detail-label">
              <ProfileFieldIcon name="thumbs-up" />
              Mis Intereses
            </span>
            <div className="interests-container">
              {data.intereses.map((int) => (
                <span key={String(int)} className="interest-tag">
                  {String(int)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {FIELD_GROUPS.map((group) => {
          const hasData = group.fields.some(
            (key) => data[key] !== undefined && data[key] !== null && data[key] !== '',
          )
          if (!hasData) return null
          return (
            <div key={group.title}>
              <div className="profile-section-header">
                <span className="section-indicator">&gt;</span> {group.title}
              </div>
              {group.fields.map((key) => {
                if (data[key] === undefined || data[key] === null || data[key] === '') return null
                excluded.add(key)
                return <OwnDetailRow key={key} fieldKey={key} value={data[key]} />
              })}
            </div>
          )
        })}

        {(() => {
          const rows = []
          Object.entries(data).forEach(([key, value]) => {
            if (excluded.has(key)) return
            if (value === null || value === undefined || value === '') return
            if (Array.isArray(value) && value.length === 0) return
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.seconds === undefined)
              return
            rows.push(<OwnDetailRow key={key} fieldKey={key} value={value} />)
          })
          if (!rows.length) return null
          return (
            <>
              <div className="profile-section-header">
                <span className="section-indicator">&gt;</span> Otras Características
              </div>
              {rows}
            </>
          )
        })()}
      </div>
    </>
  )
}
