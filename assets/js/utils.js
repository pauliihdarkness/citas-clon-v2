/**
 * Utilidades para la mini-app
 */

/**
 * Escapa caracteres HTML para evitar XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convierte cualquier tipo de timestamp (Firestore, Objeto, Fecha, String) a un objeto Date de JS
 */
export function ensureDate(timestamp) {
  if (!timestamp) return null;
  
  // 1. Ya es un objeto Date
  if (timestamp instanceof Date) return timestamp;
  
  // 2. Es un Timestamp de Firestore (tiene .toDate())
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  
  // 3. Es un objeto serializado de Firestore {seconds, nanoseconds}
  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds / 1000000));
  }
  
  // 4. Es solo segundos (común en algunas implementaciones manuales)
  if (typeof timestamp === 'number' && timestamp < 10000000000) {
    return new Date(timestamp * 1000);
  }
  
  // 5. Fallback final (Milisegundos o String ISO)
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formatea un timestamp a hora legible
 */
export function formatTime(timestamp) {
  const date = ensureDate(timestamp);
  if (!date) return '';

  try {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch (e) {
    return '';
  }
}

/**
 * Formatea una fecha relativa (ej: "hace 2 minutos")
 */
export function formatRelativeTime(timestamp) {
  const date = ensureDate(timestamp);
  if (!date) return '';

  try {
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 30) return 'Justo ahora';
    if (minutes < 1) return 'Hace instantes';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return date.toLocaleDateString('es-ES');
  } catch (e) {
    return '';
  }
}

/**
 * Trunca texto a una longitud máxima
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Extrae iniciales de un nombre
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Muestra un toast con estética SYSTEM
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-indicator">></span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entering animation
  setTimeout(() => toast.classList.add('visible'), 10);

  // Auto-remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
