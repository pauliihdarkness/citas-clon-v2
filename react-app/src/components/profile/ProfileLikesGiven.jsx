import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { db } from '../../lib/firebase'
import { ensureDate } from '../../lib/profileTextUtils'

function formatLikeDate(ts) {
  if (!ts) return 'Reciente'
  if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString('es-ES')
  const d = ensureDate(ts)
  return d ? d.toLocaleDateString('es-ES') : 'Reciente'
}

export function ProfileLikesGiven({ userId }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'likesGiven'))
        if (cancelled) return
        setItems(
          snap.docs.map((d) => ({
            targetId: d.id,
            timestamp: d.data().timestamp,
          })),
        )
      } catch (e) {
        console.error('Error fetching likes given:', e)
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <>
      <h3
        style={{
          marginTop: 24,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 8,
        }}
      >
        <Heart size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} aria-hidden />
        Likes Dados
      </h3>
      <div className="likes-given-container" style={{ marginTop: 12 }}>
        {loading ? (
          <p className="loading" style={{ fontSize: '0.9em', opacity: 0.7 }}>
            Buscando likes dados...
          </p>
        ) : null}
        {!loading && items.length === 0 ? (
          <p style={{ fontSize: '0.9em', opacity: 0.7, fontStyle: 'italic' }}>
            Este usuario todavía no ha dado ningún like.
          </p>
        ) : null}
        {!loading && items.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px',
            }}
          >
            {items.map(({ targetId, timestamp }) => (
              <div
                key={targetId}
                style={{
                  padding: '8px 12px',
                  border: '1px dashed var(--verde, #00ff55)',
                  background: 'rgba(0, 255, 85, 0.05)',
                  borderRadius: 5,
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 15,
                    textTransform: 'uppercase',
                  }}
                >
                  <Link
                    to={`/user/${encodeURIComponent(targetId)}`}
                    style={{ color: 'var(--verde, #00ff55)', textDecoration: 'none' }}
                  >
                    @{targetId}
                  </Link>
                </div>
                <div
                  style={{
                    fontSize: '0.75em',
                    color: 'var(--secondary, #888)',
                    marginTop: 4,
                  }}
                >
                  {formatLikeDate(timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
