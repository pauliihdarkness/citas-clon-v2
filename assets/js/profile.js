import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escapeHtml, formatTime, formatRelativeTime } from './utils.js';
import './activity-tracker.js';

const profileContent = document.getElementById('profile-content');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

// Verificar usuario logueado
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loadMyProfile(user.uid);
  } else {
    window.location.replace('./login.html');
  }
});

/**
 * Carga los datos del perfil propio desde Firestore
 */
async function loadMyProfile(userId) {
  try {
    profileContent.innerHTML = '<p class="loading">Cargando tu perfil...</p>';

    const userDocSnap = await getDoc(doc(db, 'users', userId));
    if (!userDocSnap.exists()) {
      profileContent.innerHTML = `
        <div class="error-box">
          <p>No se encontró información de perfil vinculada a esta cuenta.</p>
          <a href="create-profile.html" class="btn">Crear Perfil Ahora</a>
        </div>
      `;
      return;
    }

    const data = userDocSnap.data();
    
    // Guardar alias en localStorage para acceso rápido
    if (data.alias) localStorage.setItem('alias', data.alias);
    
    renderProfile(data, userId);

    // Inicializar panel de configuración (pasando membresía para restricciones)
    initSettingsPanel(userId, data.settings || {}, !!data.membresia);
  } catch (e) {
    console.error('Error cargando perfil propio:', e);
    profileContent.innerHTML = '<p class="error">Error de sistema: ' + escapeHtml(e.message) + '</p>';
  }
}

function getSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('http') && !url.startsWith('data:')) return null;
  return url;
}

/**
 * Renderiza el perfil con estética CRT premium
 */
function renderProfile(data, userId) {
  const displayName = data.alias || data.nombre || 'Sin nombre';
  const photoURL = getSafeImageUrl(data.fotoPerfilUrl);
  const location = [data.ciudad, data.provincia, data.pais].filter(Boolean).join(', ') || 'Ubicación no configurada';
  const membershipBadge = data.membresia ? '<i data-lucide="crown"></i> Premium' : '<i data-lucide="coffee"></i> Cupcake';
  
  // Campos a excluir del listado dinámico
  const excludedFields = new Set([
    'id', 'uid', 'authUid', 'creadoEn', 'fotoPerfilUrl', 'alias', 'nombre', 'ciudad',
    'provincia', 'pais', 'membresia', 'isOnline', 'lastSeen', 'departamento', 'columna',
    'biografia', 'descripcion', 'intereses', 'dniUrl', 'email', 'edad', 'coords', 'fcmToken', 'platform', 'link'
  ]);

  const fieldConfig = {
    genero: { label: 'Género', icon: 'user' },
    orientacion: { label: 'Orientación', icon: 'heart' },
    busqueda: { label: 'Lo que busco', icon: 'search' },
    link: { label: 'Instagram', icon: 'instagram' },
    animales: { label: 'Animales', icon: 'dog' },
    salud: { label: 'Salud', icon: 'activity' },
    soledad: { label: 'Estado', icon: 'user-plus' },
    torta: { label: 'Preferencia', icon: 'pie-chart' },
    signo: { label: 'Signo Zod.', icon: 'star' },
    profesion: { label: 'Profesión', icon: 'briefcase' }
  };

  let detailsHTML = `
    <div class="profile-header">
      ${photoURL ? `<img src="${photoURL}" alt="${escapeHtml(displayName)}" class="profile-photo" />` : '<div class="profile-photo-placeholder"><i data-lucide="user" size="48"></i></div>'}
      <div class="profile-info">
        <h2 style="color: var(--accent);">${escapeHtml(displayName)}</h2>
        ${data.edad ? `<p class="profile-age">${data.edad} años</p>` : ''}
        <p class="profile-location"><i data-lucide="map-pin"></i> ${escapeHtml(location)}</p>
        <p class="profile-status"><i data-lucide="circle-dot" style="color:#0f0"></i> Tú ${membershipBadge}</p>
        ${data.creadoEn ? `<p class="profile-created"><i data-lucide="calendar"></i> Desde: ${new Date(data.creadoEn.seconds ? data.creadoEn.seconds * 1000 : data.creadoEn).toLocaleDateString()}</p>` : ''}
        ${data.link ? `<p class="profile-link"><i data-lucide="instagram"></i> Instagram: @${escapeHtml(data.link)}</p>` : ''}
      </div>
    </div>

    <div class="profile-details">
  `;

  // 1. Biografía / Búsqueda
  const bio = data.biografia || data.descripcion || data.busqueda;
  if (bio) {
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="file-text"></i> Sobre mí / Búsqueda</span>
        <span class="detail-value">${escapeHtml(bio)}</span>
      </div>
    `;
  }

  // 2. Intereses
  if (data.intereses && Array.isArray(data.intereses) && data.intereses.length > 0) {
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="thumbs-up"></i> Mis Intereses</span>
        <div class="interests-container">
          ${data.intereses.map(int => `<span class="interest-tag">${escapeHtml(String(int))}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Configuración de grupos para jerarquía
  const fieldGroups = [
    {
      title: 'Información Personal',
      icon: 'user-check',
      fields: ['genero', 'orientacion', 'signo', 'altura', 'peso']
    },
    {
      title: 'Carrera y Formación',
      icon: 'briefcase',
      fields: ['profesion', 'ocupacion', 'empresa', 'educacion']
    },
    {
      title: 'Estilo de Vida',
      icon: 'activity',
      fields: ['relacion', 'hijos', 'fuma', 'bebe', 'idiomas', 'animales', 'salud', 'soledad', 'torta']
    }
  ];

  // Helper render
  const renderRow = (key, value) => {
    const config = fieldConfig[key] || { label: key, icon: 'hash' };
    let displayValue = value;
    if (Array.isArray(value)) displayValue = value.join(', ');
    
    return `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="${config.icon}"></i> ${escapeHtml(config.label)}</span>
        <span class="detail-value">${escapeHtml(String(displayValue))}</span>
      </div>
    `;
  };

  // 3. Renderizar Grupos Jerárquicos
  fieldGroups.forEach(group => {
    const hasData = group.fields.some(key => data[key] !== undefined && data[key] !== null && data[key] !== '');
    
    if (hasData) {
      detailsHTML += `
        <div class="profile-section-header">
           <span class="section-indicator">></span> ${group.title}
        </div>
      `;
      group.fields.forEach(key => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          detailsHTML += renderRow(key, data[key]);
          excludedFields.add(key); // Marcar como renderizado
        }
      });
    }
  });

  // 4. Resto de campos dinámicos
  let otherFieldsHTML = '';
  Object.entries(data).forEach(([key, value]) => {
    if (excludedFields.has(key)) return;
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    otherFieldsHTML += renderRow(key, value);
  });

  if (otherFieldsHTML) {
    detailsHTML += `
      <div class="profile-section-header">
         <span class="section-indicator">></span> Otras Características
      </div>
      ${otherFieldsHTML}
    `;
  }

  detailsHTML += '</div>';
  profileContent.innerHTML = detailsHTML;
  if (window.lucide) lucide.createIcons();
}

/**
 * Gestiona el panel de configuración y los toggles
 */
function initSettingsPanel(userId, settings, isPremium) {
  const toggleIncognito = document.getElementById('setting-incognito');
  const toggleOnline = document.getElementById('setting-show-online');
  const toggleScanlines = document.getElementById('setting-scanlines');
  const toggleSounds = document.getElementById('setting-sounds');

  if (!toggleIncognito) return;

  // 1. Cargar estado inicial y aplicar restricciones Premium
  if (!isPremium) {
    toggleIncognito.disabled = true;
    toggleIncognito.checked = false; // Forzar desactivado si no es premium
    const label = toggleIncognito.closest('.setting-item').querySelector('.setting-label');
    if (label) {
      label.innerHTML += ' <span style="color:var(--accent); font-size:9px; margin-left:5px;">[ ★ PREMIUM ]</span>';
    }
  } else {
    toggleIncognito.checked = settings.incognito || false;
  }

  toggleOnline.checked = settings.showOnline !== false; // Default true
  toggleSounds.checked = settings.sounds || false;

  // Scanlines usa localStorage + Firestore fallback
  const scanlinesSetting = localStorage.getItem('scanlines_enabled');
  if (scanlinesSetting !== null) {
    toggleScanlines.checked = scanlinesSetting === 'true';
  } else {
    toggleScanlines.checked = settings.scanlines !== false; // Default true
  }
  
  // Aplicar estado inicial de scanlines al body
  if (!toggleScanlines.checked) {
    document.body.classList.add('no-scanlines');
  }

  // 2. Event Listeners para guardado automático
  const updateSetting = async (key, value) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`settings.${key}`]: value
      });
      console.log(`[SETTINGS] Guardado: ${key} = ${value}`);
    } catch (e) {
      console.error('[SETTINGS] Error al guardar configuración:', e);
    }
  };

  toggleIncognito.addEventListener('change', (e) => {
    if (!isPremium) {
      e.target.checked = false;
      alert('Esta función requiere membresía ★ PREMIUM');
      return;
    }
    updateSetting('incognito', e.target.checked);
  });
  toggleOnline.addEventListener('change', (e) => {
    const val = e.target.checked;
    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, {
      'settings.showOnline': val,
      'isOnline': val
    }).catch(err => console.error('[SETTINGS] Error sync isOnline:', err));
  });
  toggleSounds.addEventListener('change', (e) => updateSetting('sounds', e.target.checked));

  toggleScanlines.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('scanlines_enabled', enabled);
    if (enabled) {
      document.body.classList.remove('no-scanlines');
    } else {
      document.body.classList.add('no-scanlines');
    }
    updateSetting('scanlines', enabled);
  });
}

/**
 * Logout
 */
const logoutBtnConfig = document.getElementById('logout-btn-config');
if (logoutBtnConfig) {
  logoutBtnConfig.addEventListener('click', async () => {
    if (!confirm('¿Deseas cerrar tu sesión actual?')) return;
    try {
      logoutBtnConfig.disabled = true;
      await signOut(auth);
      window.location.replace('./login.html');
    } catch (e) {
      alert('Error: ' + e.message);
      logoutBtnConfig.disabled = false;
    }
  });
}

