import { AtSign, Calendar, Circle, CircleDot, Clock, Coffee, Crown, Radar, User } from 'lucide-react'
import { ProfileFieldIcon } from './ProfileFieldIcon'
import { formatRelativeTime, formatTime, getSafeProfileImageUrl } from '../../lib/profileTextUtils'

const FIELD_CONFIG = {
  genero: { label: 'Género', icon: 'user' },
  orientacion: { label: 'Orientación', icon: 'heart' },
  altura: { label: 'Altura', icon: 'ruler' },
  peso: { label: 'Peso', icon: 'scale' },
  profesion: { label: 'Profesión', icon: 'briefcase' },
  ocupacion: { label: 'Ocupación', icon: 'briefcase' },
  empresa: { label: 'Empresa', icon: 'building' },
  educacion: { label: 'Educación', icon: 'graduation-cap' },
  signo: { label: 'Signo Zod.', icon: 'star' },
  hijos: { label: 'Hijos', icon: 'baby' },
  fuma: { label: 'Fuma', icon: 'cigarette' },
  bebe: { label: 'Bebe', icon: 'wine' },
  relacion: { label: 'Busca', icon: 'heart-handshake' },
  idiomas: { label: 'Idiomas', icon: 'languages' },
  animales: { label: 'Animales', icon: 'dog' },
  salud: { label: 'Salud', icon: 'activity' },
  soledad: { label: 'Estado', icon: 'search' },
  torta: { label: 'Torta Favorita', icon: 'cake' },
  busqueda: { label: 'Sobre Mi', icon: 'user-plus' },
  mensajesEnviados: { label: 'Mensajes', icon: 'message-square' },
  departamento: { label: 'Zona/Comuna', icon: 'building' },
  platform: { label: 'Plataforma', icon: 'activity' },
  link: { label: 'Instagram', icon: 'instagram' },
}

const FIELD_GROUPS = [
  {
    title: 'Información de Usuario',
    icon: 'user-check',
    fields: ['genero', 'orientacion', 'busqueda', 'signo', 'altura', 'peso', 'link'],
    columns: 2
  },
  {
    title: 'Carrera y Formación',
    icon: 'briefcase',
    fields: ['profesion', 'ocupacion', 'empresa', 'educacion'],
    columns: 1
  },
  {
    title: 'Estilo de Vida & Preferencias',
    icon: 'activity',
    fields: ['relacion', 'hijos', 'fuma', 'bebe', 'idiomas', 'animales', 'salud', 'soledad'],
    columns: 1
  },
  {
    title: 'Otros Detalles',
    icon: 'star',
    fields: ['torta', 'mensajesEnviados', 'departamento', 'platform'],
    columns: 2
  },
]

const BASE_EXCLUDED = new Set([
  'id',
  'uid',
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
  'biografia',
  'descripcion',
  'intereses',
  'dniUrl',
  'email',
  'edad',
  'link',
  'settings',
  'settingg',
  'auth',
  'auth uid',
  'authUid',
  'coords',
  'coorde',
  'likeCount',
])

function humanizeKey(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
}

function formatDisplayValue(value, key = '') {
  if (key === 'link' && value) {
    const clean = value.startsWith('@') ? value.slice(1) : value
    return (
      <a
        href={`https://instagram.com/${clean}`}
        target="_blank"
        rel="noopener noreferrer"
        className="clickable-link"
      >
        @{clean}
      </a>
    )
  }
  if (typeof value === 'boolean') {
    if (!value) return null
    return 'Sí'
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) return value.join(', ')
    if (value.seconds !== undefined)
      return new Date(value.seconds * 1000).toLocaleDateString('es-ES')
    return JSON.stringify(value)
  }
  return String(value)
}

function DetailValueTag({ text }) {
  return <span className="detail-tag">{text}</span>
}

function DetailRow({ fieldKey, value, config, isFullWidth = false }) {
  const formatted = formatDisplayValue(value, fieldKey)
  if (formatted === null || formatted === '') return null

  let label = humanizeKey(fieldKey)
  let icon = 'hash'
  if (config) {
    if (config.label) label = config.label
    if (config.icon) icon = config.icon
  } else if (FIELD_CONFIG[fieldKey]) {
    label = FIELD_CONFIG[fieldKey].label
    icon = FIELD_CONFIG[fieldKey].icon
  }

  // Si el valor tiene comas (y no es el link), lo mostramos como tags
  // EXCEPCIÓN: 'busqueda' es texto libre, no debe separarse en tags.
  const isListValue = typeof formatted === 'string' && formatted.includes(',') && fieldKey !== 'busqueda'
  const items = isListValue ? formatted.split(',').map(s => s.trim()).filter(Boolean) : null

  return (
    <div className={`detail-row ${isFullWidth ? 'full-width' : ''}`}>
      <span className="detail-label">
        <ProfileFieldIcon name={icon} />
        {label}
      </span>
      <div className="detail-value">
        {isListValue ? (
          <div className="detail-tags-container">
            {items.map(it => <DetailValueTag key={it} text={it} />)}
          </div>
        ) : (
          formatted
        )}
      </div>
    </div>
  )
}

function DetailRowFullWidth({ label, icon, children }) {
  return (
    <div className="detail-row full-width">
      <span className="detail-label">
        <ProfileFieldIcon name={icon} />
        {label}
      </span>
      {children}
    </div>
  )
}

export function ProfileDetails({ data, distance, hideStatus = false, hideDistance = false, leftActions, rightActions }) {
  const displayName = data.alias || data.nombre || 'Sin nombre'
  const photoURL = getSafeProfileImageUrl(data.fotoPerfilUrl)

  const location = [data.ciudad, data.provincia, data.pais].filter(Boolean).join(', ') || 'Ubicación no especificada'

  const excluded = new Set(BASE_EXCLUDED)

  const lastSeenHTML =
    data.lastSeen ? (
      <p className="profile-lastseen">
        <Clock size={16} style={{ verticalAlign: 'middle' }} aria-hidden /> Última vez:{' '}
        {formatRelativeTime(data.lastSeen)} ({formatTime(data.lastSeen)})
      </p>
    ) : null

  let creadoLine = null
  if (data.creadoEn) {
    const ms = data.creadoEn.seconds ? data.creadoEn.seconds * 1000 : new Date(data.creadoEn).getTime()
    const d = new Date(ms)
    creadoLine = (
      <p className="profile-created">
        <Calendar size={16} style={{ verticalAlign: 'middle' }} aria-hidden /> Miembro desde:{' '}
        {d.toLocaleDateString('es-ES')} {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </p>
    )
  }

  return (
    <>
      <div className="profile-header">
        {leftActions && <div className="profile-top-actions left">{leftActions}</div>}
        {rightActions && <div className="profile-top-actions right">{rightActions}</div>}
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="profile-photo" />
        ) : (
          <div className="profile-photo-placeholder">
            <User size={48} aria-hidden />
          </div>
        )}
        <div className="profile-info">
          <h2>{displayName || 'Sin nombre'} {data?.edad ? `| ${data.edad}` : ''}</h2>
          
          <div className="profile-badges">
            {!hideStatus && data && data.isOnline && (
              <span className="profile-badge badge-online">
                <CircleDot size={12} fill="currentColor" /> En línea
              </span>
            )}

            {data && (data.membresia ? (
              <span className="profile-badge badge-premium">
                <ProfileFieldIcon name="crown" size={12} /> Premium
              </span>
            ) : (
              <span className="profile-badge badge-cupcake">
                <ProfileFieldIcon name="coffee" size={12} /> Cupcake
              </span>
            ))}

            {!hideDistance && typeof distance === 'number' && !isNaN(distance) && (
              <span className="profile-badge badge-distance">
                <ProfileFieldIcon name="radar" size={12} /> {distance < 1 ? `${Math.round(distance*1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </div>

          <p className="profile-location">{location}</p>
          
          {creadoLine}
          {lastSeenHTML}
        </div>
      </div>

      <div className="profile-details">
        {data.biografia || data.descripcion ? (
          <DetailRowFullWidth label="Biografía" icon="file-text">
            <div className="detail-value bio-text">{data.biografia || data.descripcion}</div>
          </DetailRowFullWidth>
        ) : null}

        {data.intereses && Array.isArray(data.intereses) && data.intereses.length > 0 ? (
          <DetailRowFullWidth label="Intereses" icon="thumbs-up">
            <div className="interests-container">
              {data.intereses.map((int) => (
                <span key={String(int)} className="interest-tag">
                  {String(int)}
                </span>
              ))}
            </div>
          </DetailRowFullWidth>
        ) : null}

        {FIELD_GROUPS.map((group) => {
          const hasData = group.fields.some(
            (key) => data[key] !== undefined && data[key] !== null && data[key] !== '',
          )
          if (!hasData) return null
          
          return (
            <div key={group.title} className="profile-group-container">
              <div className="profile-section-header">
                <span className="section-indicator">&gt;</span> {group.title}
              </div>
              <div className={`detail-rows-grid ${group.columns === 2 ? 'grid-2' : ''}`}>
                {group.fields.map((key) => {
                  if (data[key] === undefined || data[key] === null || data[key] === '') return null
                  excluded.add(key)
                  const isFull = key === 'busqueda' || key === 'link' || key === 'orientacion' || group.columns === 1
                  return <DetailRow key={key} fieldKey={key} value={data[key]} isFullWidth={isFull} />
                })}
              </div>
            </div>
          )
        })}

        {data.email ? (
          <div className="profile-group-container">
            <div className="profile-section-header">
              <span className="section-indicator">&gt;</span> Contacto
            </div>
            <DetailRow fieldKey="email" value={data.email} config={{ label: 'Email', icon: 'mail' }} isFullWidth />
          </div>
        ) : null}

        {data.dniUrl ? (
          <div className="detail-row full-width">
            <span className="detail-label">
              <ProfileFieldIcon name="badge-check" />
              DNI Verificado
            </span>
            <img src={data.dniUrl} alt="DNI" className="dni-image" />
          </div>
        ) : null}

        {(() => {
          const rows = []
          Object.entries(data).forEach(([key, value]) => {
            if (excluded.has(key)) return
            if (value === null || value === undefined || value === '') return
            if (Array.isArray(value) && value.length === 0) return
            if (typeof value === 'boolean' && !value) return
            if (key.includes('Url') && String(value).length > 50) return
            rows.push(<DetailRow key={key} fieldKey={key} value={value} />)
          })
          if (!rows.length) return null
          return (
            <div className="profile-group-container">
              <div className="profile-section-header">
                <span className="section-indicator">&gt;</span> Otras Características
              </div>
              <div className="detail-rows-grid">
                {rows}
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}
