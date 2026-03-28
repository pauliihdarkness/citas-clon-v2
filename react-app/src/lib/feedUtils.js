function getCreatedSeconds(creadoEn) {
  if (!creadoEn) return 0
  if (typeof creadoEn.seconds === 'number') return creadoEn.seconds
  if (typeof creadoEn._seconds === 'number') return creadoEn._seconds
  return 0
}

/**
 * Orden global por fecha de creación (más recientes primero), igual que feed.js
 */
export function sortUsersByRecent(users) {
  return [...users].sort(
    (a, b) => getCreatedSeconds(b.creadoEn) - getCreatedSeconds(a.creadoEn),
  )
}

/**
 * @param {object} f
 * @param {string} f.alias
 * @param {string} f.ciudad
 * @param {string} f.edad
 * @param {boolean} f.membresia
 * @param {boolean} f.online
 * @param {boolean} f.platform
 */
export function filterFeedUsers(allUsers, f) {
  const aliasFilter = (f.alias || '').toLowerCase()
  const ciudadFilter = (f.ciudad || '').toLowerCase()
  const edadFilter = f.edad || ''
  const membresiaFilter = f.membresia
  const onlineFilter = f.online
  const platformFilter = f.platform

  return allUsers.filter((user) => {
    if (!user.alias || user.alias.trim() === '') return false

    const aliasMatch = user.alias.toLowerCase().includes(aliasFilter)

    const ciudadMatch =
      ciudadFilter === '' ||
      (user.ciudad || '').toLowerCase().includes(ciudadFilter) ||
      (user.provincia || '').toLowerCase().includes(ciudadFilter) ||
      (user.pais || '').toLowerCase().includes(ciudadFilter)

    const edadMatch = edadFilter ? String(user.edad) === String(edadFilter) : true
    const membresiaMatch = membresiaFilter ? user.membresia === true : true
    const onlineMatch = onlineFilter ? user.isOnline === true : true
    const platformMatch = platformFilter ? user.platform : true

    return (
      aliasMatch &&
      ciudadMatch &&
      edadMatch &&
      membresiaMatch &&
      onlineMatch &&
      platformMatch
    )
  })
}

function dateKeyFromUser(user) {
  const c = user.creadoEn
  if (!c) return 'Fecha desconocida'
  const seconds = c.seconds ?? c._seconds
  if (seconds == null) return 'Fecha desconocida'
  const dateObj = new Date(seconds * 1000)
  if (Number.isNaN(dateObj.getTime())) return 'Fecha desconocida'
  dateObj.setHours(0, 0, 0, 0)
  return dateObj.toISOString()
}

/**
 * @returns {{ dateKey: string, label: string, users: object[] }[]}
 */
export function buildFeedSections(filteredUsers) {
  const usersByDate = {}

  filteredUsers.forEach((user) => {
    const dateKey = dateKeyFromUser(user)
    if (!usersByDate[dateKey]) usersByDate[dateKey] = []
    usersByDate[dateKey].push(user)
  })

  const sortedDates = Object.keys(usersByDate).sort((a, b) => {
    if (a === 'Fecha desconocida') return 1
    if (b === 'Fecha desconocida') return -1
    return new Date(b) - new Date(a)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return sortedDates.map((dateKey) => {
    let label = dateKey
    if (dateKey !== 'Fecha desconocida') {
      const dateObj = new Date(dateKey)
      if (dateObj.getTime() === today.getTime()) {
        label = 'Hoy'
      } else if (dateObj.getTime() === yesterday.getTime()) {
        label = 'Ayer'
      } else {
        label = dateObj.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
        label = label.charAt(0).toUpperCase() + label.slice(1)
      }
    }

    return { dateKey, label, users: usersByDate[dateKey] }
  })
}
