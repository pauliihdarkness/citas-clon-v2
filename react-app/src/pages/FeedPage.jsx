import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import {
  CakeSlice,
  Calendar,
  CircleDot,
  Crown,
  MapPin,
  Search,
  Smartphone,
  User,
} from 'lucide-react'
import { UserCard } from '../components/UserCard'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { db } from '../lib/firebase'
import { buildFeedSections, filterFeedUsers, sortUsersByRecent } from '../lib/feedUtils'

export function FeedPage() {
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [alias, setAlias] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [edad, setEdad] = useState('')
  const [membresia, setMembresia] = useState(false)
  const [online, setOnline] = useState(false)
  const [platform, setPlatform] = useState(false)

  const debouncedAlias = useDebouncedValue(alias, 350)
  const debouncedCiudad = useDebouncedValue(ciudad, 350)
  const debouncedEdad = useDebouncedValue(edad, 350)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const usersCol = collection(db, 'users')
      const snap = await getDocs(usersCol)
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setAllUsers(sortUsersByRecent(rows))
    } catch (e) {
      console.error('Error cargando feed', e)
      setError('Error cargando perfiles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const filtered = useMemo(() => {
    return filterFeedUsers(allUsers, {
      alias: debouncedAlias,
      ciudad: debouncedCiudad,
      edad: debouncedEdad,
      membresia,
      online,
      platform,
    })
  }, [allUsers, debouncedAlias, debouncedCiudad, debouncedEdad, membresia, online, platform])

  const sections = useMemo(() => buildFeedSections(filtered), [filtered])

  function clearFilters() {
    setAlias('')
    setCiudad('')
    setEdad('')
    setMembresia(false)
    setOnline(false)
    setPlatform(false)
  }

  return (
    <section className="container">
      <h1>Feed de perfiles</h1>

      <section className="filters-container">
        <div className="filters-header">
          <h3>
            <Search size={16} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden />{' '}
            Filtros <span id="user-count">({filtered.length})</span>
          </h3>
          <button type="button" id="clear-filters" className="btn-small" onClick={clearFilters}>
            Limpiar
          </button>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>
              <User size={14} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden />{' '}
              Alias
            </label>
            <input
              type="text"
              id="searchAlias"
              placeholder="Buscar..."
              autoComplete="off"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden />{' '}
              Ciudad
            </label>
            <input
              type="text"
              id="searchCiudad"
              placeholder="Buscar..."
              autoComplete="off"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>
              <CakeSlice size={14} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden />{' '}
              Edad
            </label>
            <input
              type="number"
              id="searchEdad"
              placeholder="Edad"
              min={18}
              max={99}
              autoComplete="off"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Opciones</label>
            <div className="filter-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="filterMembresia"
                  checked={membresia}
                  onChange={(e) => setMembresia(e.target.checked)}
                />
                <span>
                  <Crown size={16} aria-hidden />
                </span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="filterOnline"
                  checked={online}
                  onChange={(e) => setOnline(e.target.checked)}
                />
                <span>
                  <CircleDot size={16} aria-hidden />
                </span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="filterPlatform"
                  checked={platform}
                  onChange={(e) => setPlatform(e.target.checked)}
                />
                <span>
                  <Smartphone size={16} aria-hidden />
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="loading-message-overlay">Cargando perfiles...</div>
      ) : null}

      {!loading && error ? <p className="error">{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="empty">No hay perfiles que coincidan con los filtros.</p>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div id="feed" className="cards-grid">
          {sections.map(({ dateKey, label, users }) => (
            <Fragment key={dateKey}>
              <h3 className="feed-date-separator">
                <Calendar size={18} style={{ verticalAlign: 'middle' }} aria-hidden /> {label}
              </h3>
              {users.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </Fragment>
          ))}
        </div>
      ) : null}
    </section>
  )
}
