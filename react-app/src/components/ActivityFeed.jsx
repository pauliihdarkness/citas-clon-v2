import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function ActivityFeed({ maxItems = 5, showHeader = true, compact = false }) {
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    async function loadActivity() {
      try {
        const q = query(collection(db, 'users'), orderBy('creadoEn', 'desc'), limit(maxItems))
        const snap = await getDocs(q)
        setRecentUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('Error cargando actividad', e)
      } finally {
        setLoading(false)
      }
    }
    loadActivity()
  }, [maxItems])

  return (
    <div className={`activity-feed-wrapper ${compact ? 'compact' : ''}`}>
      {showHeader && (
        <div className="activity-header">
          <Zap size={18} className="sidebar-logo" />
          <h3>Actividad del Sistema</h3>
        </div>
      )}
      
      <div className="activity-list">
        {loading ? (
          <div className="loading-small">Sincronizando log...</div>
        ) : recentUsers
            .filter(u => !currentUser || u.id !== currentUser.uid)
            .map((u) => (
          <div key={u.id} className="activity-item">
            <div className="activity-dot" />
            <div className="activity-content">
              <Link to={`/user/${encodeURIComponent(u.id)}`} className="activity-user">
                @{u.alias || u.id.slice(0, 8)}
              </Link>
              <span className="activity-text">ha entrado en el sistema</span>
            </div>
          </div>
        ))}
        {!loading && recentUsers.length === 0 && (
          <div className="loading-small" style={{ opacity: 0.5 }}>Sin actividad reciente.</div>
        )}
      </div>
      
      {!compact && (
        <div className="activity-footer">
          <div className="status-indicator">MODO ESCANEO ACTIVO</div>
        </div>
      )}
    </div>
  )
}
