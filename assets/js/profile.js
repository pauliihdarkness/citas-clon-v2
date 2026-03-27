import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escapeHtml } from './utils.js';
import './activity-tracker.js'; // Rastreo automático de actividad

const profileContent = document.getElementById('profile-content');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

// Verificar usuario logueado
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loadProfile(user);
  } else {
    window.location.replace('./login.html');
  }
});

/**
 * Carga los datos del perfil del usuario desde Firestore
 */
async function loadProfile(user) {
  try {
    profileContent.innerHTML = '<p class="loading">Cargando perfil...</p>';

    // Obtener datos de Firestore si existen
    let firestoreData = {};
    try {
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        firestoreData = userDocSnap.data();
        console.log('Datos de Firestore encontrados:', firestoreData);
      }
    } catch (e) {
      console.warn('No se pudieron cargar datos de Firestore:', e);
    }

    // Combinar datos de Auth y Firestore
    const profileData = {
      uid: user.uid,
      email: user.email || 'No disponible',
      displayName: user.displayName || firestoreData.alias || firestoreData.nombre || 'Sin nombre',
      photoURL: user.photoURL || firestoreData.fotoPerfilUrl || null,
      alias: firestoreData.alias || user.displayName || 'Sin alias',
      edad: firestoreData.edad || null,
      ciudad: firestoreData.ciudad || null,
      provincia: firestoreData.provincia || null,
      pais: firestoreData.pais || null,
      biografia: firestoreData.biografia || firestoreData.descripcion || 'Sin biografía',
      membresia: firestoreData.membresia || false,
      isOnline: firestoreData.isOnline || false,
    };

    renderProfile(profileData);
  } catch (e) {
    console.error('Error cargando perfil:', e);
    profileContent.innerHTML = '<p class="error">Error al cargar el perfil: ' + escapeHtml(e.message) + '</p>';
  }
}

/**
 * Renderiza el perfil en la UI
 */
function renderProfile(data) {
  const membershipBadge = data.membresia ? '<i data-lucide="crown"></i> Premium' : '<i data-lucide="coffee"></i> Cupcake';
  const onlineStatus = data.isOnline ? '<i data-lucide="circle-dot"></i> En línea' : '<i data-lucide="circle"></i> Desconectada';

  const location = [data.ciudad, data.provincia, data.pais]
    .filter(Boolean)
    .join(', ') || 'Ubicación no especificada';

  // Configuracion de campos conocidos
  const fieldConfig = {
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
    idiomas: { label: 'Idiomas', icon: 'languages' }
  };

  const priorityOrder = [
    'genero', 'orientacion', 'altura', 'signo',
    'profesion', 'ocupacion', 'empresa', 'educacion',
    'relacion', 'hijos', 'fuma', 'bebe', 'idiomas'
  ];

  // Campos a excluir del listado dinámico 
  const excludedFields = new Set([
    'id', 'uid', 'creadoEn', 'fotoPerfilUrl', 'alias', 'nombre', 'ciudad',
    'provincia', 'pais', 'membresia', 'isOnline', 'lastSeen',
    'biografia', 'descripcion', 'intereses', 'email', 'edad'
  ]);

  let detailsHTML = `
    <div class="profile-header">
    ${data.photoURL ? `<img src="${data.photoURL}" alt="${escapeHtml(data.displayName)}" class="profile-photo" />` : '<div class="profile-photo-placeholder"><i data-lucide="user" size="48"></i></div>'}
      <div class="profile-info">
        <h2>${escapeHtml(data.displayName)}</h2>
        ${data.edad ? `<p class="profile-age">${data.edad} años</p>` : ''}
        <p class="profile-location">${escapeHtml(location)}</p>
        <p class="profile-status">${onlineStatus} ${membershipBadge}</p>
      </div>
    </div>

    <div class="profile-details">
  `;

  // 1. Biografía
  if (data.biografia || data.descripcion) {
    const bio = data.biografia || data.descripcion;
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="file-text"></i> Biografía:</span>
        <p class="detail-value">${escapeHtml(bio)}</p>
      </div>
    `;
  }

  // 2. Intereses
  if (data.intereses && Array.isArray(data.intereses) && data.intereses.length > 0) {
    const interestsList = data.intereses.map(int => `<span class="interest-tag">${escapeHtml(String(int))}</span>`).join('');
    detailsHTML += `
       <div class="detail-row full-width">
         <span class="detail-label"><i data-lucide="thumbs-up"></i> Intereses:</span>
         <div class="interests-container">${interestsList}</div>
       </div>
     `;
  }

  // Helper para renderizar fila
  const renderRow = (key, value, config = null) => {
    let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    let icon = 'hash';

    if (config) {
      if (config.label) label = config.label;
      if (config.icon) icon = config.icon;
    } else if (fieldConfig[key]) {
      label = fieldConfig[key].label;
      icon = fieldConfig[key].icon;
    }

    let displayValue = value;
    if (typeof value === 'object') {
      if (Array.isArray(value)) displayValue = value.join(', ');
      else if (value.seconds) displayValue = new Date(value.seconds * 1000).toLocaleDateString('es-ES');
      else displayValue = JSON.stringify(value);
    }

    if (typeof value === 'boolean') {
      if (!value) return '';
      displayValue = 'Sí';
    }

    return `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="${icon}"></i> ${escapeHtml(label)}:</span>
        <span class="detail-value">${escapeHtml(String(displayValue))}</span>
      </div>
    `;
  };

  // 3. Campos Prioritarios
  priorityOrder.forEach(key => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      detailsHTML += renderRow(key, data[key]);
      excludedFields.add(key);
    }
  });

  // 4. Contacto (Email)
  if (data.email) {
    detailsHTML += `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="mail"></i> Email:</span>
        <span class="detail-value">${escapeHtml(data.email)}</span>
      </div>
    `;
  }

  // 5. Resto Dinámico
  Object.entries(data).forEach(([key, value]) => {
    if (excludedFields.has(key)) return;
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'boolean' && !value) return;
    if (key.includes('Url') && String(value).length > 50) return;

    detailsHTML += renderRow(key, value);
  });

  detailsHTML += `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="hash"></i> ID Usuario:</span>
        <span class="detail-value small">${escapeHtml(data.uid)}</span>
      </div>
    </div>
  `;

  profileContent.innerHTML = detailsHTML;
  lucide.createIcons();
}

/**
 * Manejar logout
 */
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Cerrando sesión...';
      await signOut(auth);
      console.log('Sesión cerrada');
      window.location.replace('./login.html');
    } catch (e) {
      console.error('Error cerrando sesión:', e);
      alert('Error al cerrar sesión: ' + e.message);
      logoutBtn.disabled = false;
      logoutBtn.textContent = 'Cerrar Sesión';
    }
  });
}
