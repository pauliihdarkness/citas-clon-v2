export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function ensureDate(timestamp) {
  if (!timestamp) return null

  if (timestamp instanceof Date) return timestamp

  if (typeof timestamp.toDate === 'function') return timestamp.toDate()

  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
  }

  if (typeof timestamp === 'number' && timestamp < 10000000000) {
    return new Date(timestamp * 1000)
  }

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatTime(timestamp) {
  const date = ensureDate(timestamp)
  if (!date) return ''
  try {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ''
  }
}

export function formatRelativeTime(timestamp) {
  const date = ensureDate(timestamp)
  if (!date) return ''
  try {
    const now = new Date()
    const diff = now - date
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (seconds < 30) return 'Justo ahora'
    if (minutes < 1) return 'Hace instantes'
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    return date.toLocaleDateString('es-ES')
  } catch {
    return ''
  }
}

export function getSafeProfileImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  if (!url.startsWith('http') && !url.startsWith('data:')) {
    console.warn(`⚠️ URL de imagen malformada detectada: "${url}".`)
    return null
  }
  return url
}
