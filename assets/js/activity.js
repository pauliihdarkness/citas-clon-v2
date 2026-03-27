import { db, collection, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp } from './firebase-config.js';
import { onAuthStateChanged, auth } from './firebase-config.js';
import { escapeHtml } from './utils.js';

const activityContent = document.getElementById('activity-content');
const sortSelect = document.getElementById('sort-select');
const filterBtns = document.querySelectorAll('.filter-btn');

let allUsers = [];
let currentUser = null;
let currentFilter = 'all';
let currentSort = 'recent';

// Verificar usuario logueado
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    // Actualizar lastSeen cuando el usuario se conecta
    updateUserActivity(user.uid);
    loadActivity();
  } else {
    window.location.replace('./login.html');
  }
});

/**
 * Actualiza el timestamp de última actividad del usuario
 */
async function updateUserActivity(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      isOnline: true
    });
    console.log('✓ Actividad actualizada');
  } catch (e) {
    console.warn('No se pudo actualizar actividad:', e);
  }
}

/**
 * Marca al usuario como desconectado cuando abandona la página
 */
window.addEventListener('beforeunload', () => {
  if (currentUser && currentUser.uid) {
    // Intentar actualizar, pero puede no completarse
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, {
      isOnline: false
    }).catch(e => console.warn('No se pudo marcar como desconectado'));
  }
});

/**
 * Carga todos les usuaries y su actividad
 */
async function loadActivity() {
  try {
    activityContent.innerHTML = '<p class="loading"><i data-lucide="loader"></i> Cargando actividad...</p>';

    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);

    allUsers = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          alias: data.alias || 'Sin nombre',
          nombre: data.nombre || data.displayName || 'Desconocido',
          edad: data.edad || null,
          ciudad: data.ciudad || null,
          provincia: data.provincia || null,
          pais: data.pais || null,
          fotoPerfilUrl: data.fotoPerfilUrl || null,
          isOnline: data.isOnline || false,
          membresia: data.membresia || false,
          lastSeen: data.lastSeen || null,
          creadoEn: data.creadoEn || null
        };
      })
      .filter(user => user.id !== currentUser.uid); // Excluir usuario actual

    console.log(`📊 Cargados ${allUsers.length} usuaries`);
    updateStats();
    renderActivity();
    setupEventListeners();

  } catch (e) {
    console.error('Error cargando actividad:', e);
    activityContent.innerHTML = `<p class="error">Error al cargar la actividad: ${escapeHtml(e.message)}</p>`;
  }
}

/**
 * Actualiza las estadísticas en el header
 */
function updateStats() {
  const onlineCount = allUsers.filter(u => u.isOnline).length;
  const totalCount = allUsers.length;
  const now = new Date();

  document.getElementById('online-count').textContent = onlineCount;
  document.getElementById('total-count').textContent = totalCount;
  document.getElementById('update-time').textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Filtra usuaries según el filtro activo
 */
function filterUsers(users) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return users.filter(user => {
    switch (currentFilter) {
      case 'online':
        return user.isOnline;

      case 'offline':
        return !user.isOnline;

      case 'premium':
        return user.membresia;

      case 'today':
        if (!user.lastSeen) return false;
        const lastSeenDate = new Date(
          user.lastSeen.seconds ? user.lastSeen.seconds * 1000 : user.lastSeen
        );
        const lastSeenDay = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());
        return lastSeenDay.getTime() === today.getTime();

      default: // 'all'
        return true;
    }
  });
}

/**
 * Ordena usuaries según el criterio seleccionado
 */
function sortUsers(users) {
  const sorted = [...users];

  switch (currentSort) {
    case 'recent':
      sorted.sort((a, b) => {
        const timeA = a.lastSeen ? (a.lastSeen.seconds || 0) : 0;
        const timeB = b.lastSeen ? (b.lastSeen.seconds || 0) : 0;
        return timeB - timeA;
      });
      break;

    case 'oldest':
      sorted.sort((a, b) => {
        const timeA = a.lastSeen ? (a.lastSeen.seconds || 0) : Infinity;
        const timeB = b.lastSeen ? (b.lastSeen.seconds || 0) : Infinity;
        return timeA - timeB;
      });
      break;

    case 'online':
      sorted.sort((a, b) => {
        if (a.isOnline === b.isOnline) {
          // Si ambos tienen el mismo estado, ordenar por reciente
          const timeA = a.lastSeen ? (a.lastSeen.seconds || 0) : 0;
          const timeB = b.lastSeen ? (b.lastSeen.seconds || 0) : 0;
          return timeB - timeA;
        }
        return a.isOnline ? -1 : 1;
      });
      break;

    case 'name':
      sorted.sort((a, b) => a.alias.localeCompare(b.alias));
      break;
  }

  return sorted;
}

/**
 * Agrupa usuaries por tiempo de actividad
 */
function groupUsersByTime(users) {
  const now = new Date();
  const groups = {
    'En línea ahora': [],
    'Últimas 24 horas': [],
    'Esta semana': [],
    'Hace más de una semana': [],
    'Nunca conectado': []
  };

  users.forEach(user => {
    if (user.isOnline) {
      groups['En línea ahora'].push(user);
    } else if (user.lastSeen) {
      const lastSeenTime = new Date(user.lastSeen.seconds ? user.lastSeen.seconds * 1000 : user.lastSeen);
      const diffMs = now - lastSeenTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffHours < 24) {
        groups['Últimas 24 horas'].push(user);
      } else if (diffDays < 7) {
        groups['Esta semana'].push(user);
      } else {
        groups['Hace más de una semana'].push(user);
      }
    } else {
      groups['Nunca conectado'].push(user);
    }
  });

  return groups;
}

/**
 * Actualiza solo los tiempos relativos sin recargar la lista completa
 */
function updateRelativeTimes() {
  const timeElements = document.querySelectorAll('.activity-time');
  timeElements.forEach((el) => {
    const parentItem = el.closest('.activity-item');
    if (parentItem) {
      // Recalcular el tiempo relativo basado en el data-timestamp
      const timestamp = parentItem.dataset.timestamp;
      if (timestamp) {
        const lastSeenTime = new Date(parseInt(timestamp));
        el.textContent = formatRelativeTime(lastSeenTime);
      }
    }
  });
}

/**
 * Renderiza la actividad
 */
function renderActivity() {
  // Filtrar usuaries
  let filteredUsers = filterUsers(allUsers);

  if (filteredUsers.length === 0) {
    activityContent.innerHTML = '<p class="empty"><i data-lucide="inbox"></i> No hay usuaries con este filtro</p>';
    lucide.createIcons();
    return;
  }

  // Ordenar usuaries
  let sortedUsers = sortUsers(filteredUsers);

  // Agrupar por tiempo
  const groupedUsers = groupUsersByTime(sortedUsers);

  // Renderizar grupos
  activityContent.innerHTML = '';

  Object.entries(groupedUsers).forEach(([groupName, users]) => {
    if (users.length === 0) return;

    // Crear header del grupo
    const groupDiv = document.createElement('div');
    groupDiv.className = 'activity-group';

    const groupTitle = document.createElement('div');
    groupTitle.className = 'activity-group-title';

    let iconName = 'clock';
    if (groupName === 'En línea ahora') iconName = 'circle-dot';
    if (groupName === 'Últimas 24 horas') iconName = 'calendar';
    if (groupName === 'Esta semana') iconName = 'calendar-days';
    if (groupName === 'Hace más de una semana') iconName = 'clock';
    if (groupName === 'Nunca conectado') iconName = 'user-x';

    groupTitle.innerHTML = `<i data-lucide="${iconName}"></i> ${groupName} (${users.length})`;
    groupDiv.appendChild(groupTitle);

    // Renderizar usuaries del grupo
    users.forEach(user => {
      const item = createActivityItem(user);
      groupDiv.appendChild(item);
    });

    activityContent.appendChild(groupDiv);
  });

  lucide.createIcons();
}

/**
 * Crea un elemento de actividad
 */
function createActivityItem(user) {
  const item = document.createElement('div');
  item.className = 'activity-item';
  
  // Guardar timestamp para actualizar tiempos relativos
  if (user.lastSeen) {
    const timestamp = user.lastSeen.seconds ? user.lastSeen.seconds * 1000 : user.lastSeen;
    item.dataset.timestamp = timestamp;
  }

  // Avatar
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'activity-avatar';
  avatarDiv.textContent = user.alias.charAt(0).toUpperCase();

  // Info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'activity-info';

  // Nombre con badge de estado
  const nameDiv = document.createElement('div');
  nameDiv.className = 'activity-name';
  const badge = document.createElement('span');
  badge.className = user.isOnline ? 'online-badge' : 'offline-badge';
  badge.title = user.isOnline ? 'En línea' : 'Desconectado';
  nameDiv.appendChild(badge);
  nameDiv.appendChild(document.createTextNode(escapeHtml(user.alias)));

  if (user.membresia) {
    const premiumBadge = document.createElement('span');
    premiumBadge.className = 'premium-badge';
    premiumBadge.textContent = 'PREMIUM';
    nameDiv.appendChild(premiumBadge);
  }

  infoDiv.appendChild(nameDiv);

  // Meta datos
  const metaDiv = document.createElement('div');
  metaDiv.className = 'activity-meta';

  // Edad
  if (user.edad) {
    const ageSpan = document.createElement('span');
    ageSpan.innerHTML = `<i data-lucide="calendar"></i> ${user.edad}`;
    metaDiv.appendChild(ageSpan);
  }

  // Ubicación
  const location = [user.ciudad, user.provincia, user.pais].filter(Boolean).join(', ');
  if (location) {
    const locSpan = document.createElement('span');
    locSpan.className = 'activity-location';
    locSpan.innerHTML = `<i data-lucide="map-pin"></i> ${escapeHtml(location)}`;
    metaDiv.appendChild(locSpan);
  }

  infoDiv.appendChild(metaDiv);

  // Tiempo de última actividad
  const timeDiv = document.createElement('div');
  timeDiv.className = 'activity-time';

  if (user.isOnline) {
    timeDiv.innerHTML = '✓ En línea ahora';
  } else if (user.lastSeen) {
    const lastSeenTime = new Date(user.lastSeen.seconds ? user.lastSeen.seconds * 1000 : user.lastSeen);
    timeDiv.textContent = formatRelativeTime(lastSeenTime);
  } else {
    timeDiv.textContent = 'Nunca';
  }

  infoDiv.appendChild(timeDiv);

  // Armar elemento
  item.appendChild(avatarDiv);
  item.appendChild(infoDiv);

  // Click para ver perfil
  item.addEventListener('click', () => {
    window.location.href = `user-profile.html?id=${user.id}`;
  });

  return item;
}

/**
 * Formatea tiempo relativo
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Hace unos segundos';
  if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)}s`;

  return date.toLocaleDateString('es-ES');
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Filtros
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderActivity();
      lucide.createIcons();
    });
  });

  // Ordenamiento
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderActivity();
    lucide.createIcons();
  });
}

// Recargar actividad cada 30 segundos
let lastRefreshTime = Date.now();
setInterval(() => {
  const now = Date.now();
  // Solo recargar si hay cambios significativos (cada 60 segundos)
  if (now - lastRefreshTime > 60000) {
    lastRefreshTime = now;
    console.log('🔄 Recargando actividad completa...');
    loadActivity();
  } else {
    // Actualizar solo las estadísticas sin recargar lista
    updateStats();
    updateRelativeTimes();
  }
}, 30000);

// Recargar cuando vuelve a la página
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('📱 Página visible, recargando actividad...');
    loadActivity();
  }
});

console.log('✓ Activity module loaded');
