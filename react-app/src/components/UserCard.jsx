import { Crown, Folder } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function UserCard({ user }) {
  const navigate = useNavigate()
  const { id, alias, edad, ciudad, provincia, membresia } = user
  const locationParts = [ciudad, provincia].filter(Boolean)
  const locationText = partsJoined(locationParts)

  function onClick() {
    navigate(`/user/${id}`)
  }

  const title = `${alias || 'Sin nombre'}${edad ? ` ,${edad}` : ''}`

  if (membresia === true) {
    return (
      <div
        role="button"
        tabIndex={0}
        className="card-user premium"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <div className="folder-icon">
          <Crown size={20} aria-hidden />
        </div>
        <div className="user-info">
          <h3 className="premium-text">
            {title} <Crown size={12} style={{ verticalAlign: 'middle' }} aria-hidden />
          </h3>
          <p>{locationText}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="card-user"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="folder-icon">
        <Folder size={20} aria-hidden />
      </div>
      <div className="user-info">
        <h3>{title}</h3>
        <p>{locationText}</p>
      </div>
    </div>
  )
}

function partsJoined(parts) {
  if (!parts.length) return ''
  return parts.join(', ')
}
