import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDoc, doc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escapeHtml, formatTime, formatRelativeTime } from './utils.js';
import { LOCATIONS_DATA } from './locations-data.js';

const profileContent = document.getElementById('profile-content');
const backBtn = document.getElementById('back-btn');
const messageBtn = document.getElementById('message-btn');

let currentUser = null;
let viewedUserId = null;

// Verificar usuario logueado
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    // Obtener ID del usuario a ver desde la URL
    const params = new URLSearchParams(window.location.search);
    viewedUserId = params.get('id');

    if (viewedUserId) {
      loadUserProfile(viewedUserId);
    } else {
      profileContent.innerHTML = '<p class="error">ID de usuario no especificado</p>';
    }
  } else {
    window.location.replace('./login.html');
  }
});

/**
 * Carga el perfil de un usuario específico
 */
async function loadUserProfile(userId) {
  try {
    profileContent.innerHTML = '<p class="loading">Cargando perfil...</p>';

    // Obtener datos de Firestore
    const userDocSnap = await getDoc(doc(db, 'users', userId));

    if (!userDocSnap.exists()) {
      profileContent.innerHTML = '<p class="error">Usuario no encontrado</p>';
      return;
    }

    const firestoreData = userDocSnap.data();
    console.log('Datos completos del usuario:', firestoreData);

    renderUserProfile(firestoreData, userId);
    setupButtons(firestoreData, userId);
    
    // Cargar y mostrar la subcolección de likes dados
    fetchAndRenderLikesGiven(userId);

    // Inicializar mini-mapa de ubicación
    initProfileMap(firestoreData);
  } catch (e) {
    console.error('Error cargando perfil de usuario:', e);
    profileContent.innerHTML = '<p class="error">Error al cargar el perfil: ' + escapeHtml(e.message) + '</p>';
  }
}

async function fetchAndRenderLikesGiven(userId) {
  try {
    const likesHeader = document.createElement('h3');
    likesHeader.innerHTML = '<i data-lucide="heart" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"></i>Likes Dados';
    likesHeader.style.marginTop = '24px';
    likesHeader.style.borderBottom = '1px solid var(--border)';
    likesHeader.style.paddingBottom = '8px';
    profileContent.appendChild(likesHeader);
    
    const likesContainer = document.createElement('div');
    likesContainer.className = 'likes-given-container';
    likesContainer.style.marginTop = '12px';
    likesContainer.innerHTML = '<p class="loading" style="font-size: 0.9em; opacity: 0.7;">Buscando likes dados...</p>';
    profileContent.appendChild(likesContainer);

    // Obtener la subcolección 'likesGiven'
    const likesCol = collection(db, 'users', userId, 'likesGiven');
    const snapshot = await getDocs(likesCol);
    
    likesContainer.innerHTML = '';
    
    if (snapshot.empty) {
      likesContainer.innerHTML = '<p style="font-size: 0.9em; opacity: 0.7; font-style: italic;">Este usuario todavía no ha dado ningún like.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
    grid.style.gap = '10px';

    snapshot.forEach(docSnap => {
      const likeData = docSnap.data();
      const div = document.createElement('div');
      div.style.padding = '8px 12px';
      div.style.border = '1px dashed var(--verde, #00ff55)';
      div.style.background = 'rgba(0, 255, 85, 0.05)';
      div.style.borderRadius = '5px';
      
      const toAlias = docSnap.id;
      const timestamp = likeData.timestamp?.toDate ? likeData.timestamp.toDate().toLocaleDateString('es-ES') : 'Reciente';
      
      div.innerHTML = `
        <div style="font-weight: bold; font-family: 'Share Tech Mono', monospace; font-size: 15px; text-transform: uppercase;">
          <a href="user-profile.html?id=${encodeURIComponent(toAlias)}" style="color: var(--verde, #00ff55); text-decoration: none;">@${escapeHtml(toAlias)}</a>
        </div>
        <div style="font-size: 0.75em; color: var(--secondary, #888); margin-top: 4px;">${timestamp}</div>
      `;
      grid.appendChild(div);
    });

    likesContainer.appendChild(grid);
    if (window.lucide) window.lucide.createIcons();
    
  } catch(e) {
    console.error('Error fetching likes given:', e);
  }
}

function getSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // if URL is malformed or relative (like the reported "ffffff?text=?")
  if (!url.startsWith('http') && !url.startsWith('data:')) {
    console.warn(`⚠️ URL de imagen malformada detectada: "${url}".`);
    return null;
  }
  return url;
}

/**
 * Renderiza el perfil del usuario en la UI - Muestra TODOS los datos
 */
function renderUserProfile(data, userId) {
  const displayName = data.alias || data.nombre || 'Sin nombre';
  const photoURL = getSafeImageUrl(data.fotoPerfilUrl);

  const location = [data.ciudad, data.provincia, data.pais]
    .filter(Boolean)
    .join(', ') || 'Ubicación no especificada';

  const membershipBadge = data.membresia ? '<i data-lucide="crown"></i> Premium' : '<i data-lucide="coffee"></i> Cupcake';
  const onlineStatus = data.isOnline ? '<i data-lucide="circle-dot"></i> En línea' : '<i data-lucide="circle"></i> Desconectada';

  // Formatear lastSeen si existe
  let lastSeenHTML = '';
  if (data.lastSeen) {
    const lastSeenTime = formatTime(data.lastSeen);
    const lastSeenRelative = formatRelativeTime(data.lastSeen);
    lastSeenHTML = `<p class="profile-lastseen"><i data-lucide="clock"></i> Última vez: ${lastSeenRelative} (${lastSeenTime})</p>`;
  }

  // Campos a excluir del listado dinámico (porque se muestran específicamente o en el header)
  const excludedFields = new Set([
    'id', 'uid', 'creadoEn', 'fotoPerfilUrl', 'alias', 'nombre', 'ciudad',
    'provincia', 'pais', 'membresia', 'isOnline', 'lastSeen',
    'biografia', 'descripcion', 'intereses', 'dniUrl', 'email', 'edad'
  ]);

  // Configuración de campos conocidos (Iconos y etiquetas)
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
    'genero', 'orientacion', 'altura', 'signo', // Físico / Básico
    'profesion', 'ocupacion', 'empresa', 'educacion', // Carrera
    'relacion', 'hijos', 'fuma', 'bebe', 'idiomas' // Estilo de vida
  ];

  let detailsHTML = `
    <div class="profile-header">
      ${photoURL ? `<img src="${photoURL}" alt="${escapeHtml(displayName)}" class="profile-photo" />` : '<div class="profile-photo-placeholder"><i data-lucide="user" size="48"></i></div>'}
      <div class="profile-info">
        <h2>${escapeHtml(displayName)}</h2>
        ${data.edad ? `<p class="profile-age">${data.edad} años</p>` : ''}
        <p class="profile-location">${escapeHtml(location)}</p>
        <p class="profile-status">${onlineStatus} ${membershipBadge}</p>
        ${lastSeenHTML}
        ${data.creadoEn ? `<p class="profile-created"><i data-lucide="calendar"></i> Miembro desde: ${new Date(data.creadoEn.seconds ? data.creadoEn.seconds * 1000 : data.creadoEn).toLocaleDateString('es-ES')} ${new Date(data.creadoEn.seconds ? data.creadoEn.seconds * 1000 : data.creadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>` : ''}
      </div>
    </div>

    <div class="profile-details">
  `;

  // 1. Biografía (Top Priority)
  if (data.biografia || data.descripcion) {
    const bio = data.biografia || data.descripcion;
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="file-text"></i> Biografía</span>
        <span class="detail-value">${escapeHtml(bio)}</span>
      </div>
    `;
  }

  // 2. Intereses (High Priority)
  if (data.intereses && Array.isArray(data.intereses) && data.intereses.length > 0) {
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="thumbs-up"></i> Intereses</span>
        <div class="interests-container">
          ${data.intereses.map(int => `<span class="interest-tag">${escapeHtml(String(int))}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Helper para renderizar fila
  const renderRow = (key, value, config = null) => {
    let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    let icon = 'hash'; // default icon

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

    // Check boolean logic just in case
    if (typeof value === 'boolean') {
      if (!value) return '';
      displayValue = 'Sí';
    }

    return `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="${icon}"></i> ${escapeHtml(label)}</span>
        <span class="detail-value">${escapeHtml(String(displayValue))}</span>
      </div>
    `;
  };

  // 3. Campos Prioritarios Ordenados
  priorityOrder.forEach(key => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      detailsHTML += renderRow(key, data[key]);
      excludedFields.add(key); // Marcar como renderizado
    }
  });

  // 4. Contacto (Email)
  if (data.email) {
    detailsHTML += `
      <div class="detail-row">
        <span class="detail-label"><i data-lucide="mail"></i> Email</span>
        <span class="detail-value">${escapeHtml(data.email)}</span>
      </div>
    `;
  }

  // 5. DNI Verificado
  if (data.dniUrl) {
    detailsHTML += `
      <div class="detail-row full-width">
        <span class="detail-label"><i data-lucide="badge-check"></i> DNI Verificado</span>
        <img src="${data.dniUrl}" alt="DNI" class="dni-image" />
      </div>
    `;
  }

  // 6. Resto de campos (Dynamic Catch-all)
  Object.entries(data).forEach(([key, value]) => {
    // Saltamos lo que ya mostramos o excluimos
    if (excludedFields.has(key)) return;
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'boolean' && !value) return;

    // No mostrar URLs de fotos grandes como texto
    if (key.includes('Url') && String(value).length > 50) return;

    detailsHTML += renderRow(key, value);
  });

  detailsHTML += '</div>';

  profileContent.innerHTML = detailsHTML;
  lucide.createIcons();
}

/**
 * Configura los botones de acción
 */
function setupButtons(profileData, userId) {
  // Botón volver
  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  // Botón enviar mensaje
  messageBtn.addEventListener('click', () => {
    if (profileData.alias) {
      window.location.href = `./chat-personal.html?id=${profileData.alias}`;
    } else {
      alert('Este usuario no tiene un alias, no se puede iniciar chat.');
    }
  });
}

// ============================================================================
// MINI-MAPA DE UBICACIÓN
// ============================================================================
const PROVINCE_COORDS = {
  "buenos aires c.f.": [-34.6186, -58.4420],
  "caba": [-34.6186, -58.4420],
  "capital federal": [-34.6186, -58.4420],
  "buenos aires": [-34.6186, -58.4420], 
  "córdoba": [-31.4201, -64.1888],
  "santa fe": [-31.6107, -60.6973],
  "mendoza": [-32.8895, -68.8458],
  "tucumán": [-26.8083, -65.2176],
  "entre ríos": [-32.0589, -59.2014],
  "misiones": [-26.8753, -54.4613],
  "corrientes": [-28.7744, -58.4439],
  "chaco": [-26.3868, -60.7653],
  "formosa": [-24.8949, -59.9324],
  "salta": [-24.7821, -65.4232],
  "jujuy": [-23.32, -65.76],
  "catamarca": [-27.33, -66.94],
  "la rioja": [-29.68, -67.18],
  "san juan": [-30.86, -68.88],
  "san luis": [-33.75, -66.03],
  "la pampa": [-37.13, -65.44],
  "neuquén": [-38.57, -70.16],
  "río negro": [-40.73, -67.25],
  "chubut": [-43.78, -68.52],
  "santa cruz": [-48.81, -69.95],
  "tierra del fuego": [-54.51, -67.48],
  "argentina": [-38.4161, -63.6167],
  "paraguay": [-23.4425, -58.4438],
  "uruguay": [-32.5228, -55.7658],
  "méxico": [23.6345, -102.5528],
  "españa": [40.4637, -3.7492],
};

function resolveCoords(data) {
  // 1. Coords directas de Firestore
  if (data.coords && Array.isArray(data.coords) && data.coords.length === 2) {
    return { coords: data.coords, level: 'exact' };
  }

  // 2. Resolver desde diccionario local (LOCATIONS_DATA)
  const parts = [data.ciudad, data.departamento || data.columna, data.provincia, data.pais]
    .filter(Boolean).map(p => p.toLowerCase().trim());
  
  if (parts.length === 0) return null;

  const fullSearchStr = parts.join(', ');

  // Match exacto con el string completo
  if (LOCATIONS_DATA[fullSearchStr] && LOCATIONS_DATA[fullSearchStr][0] !== 0) {
    return { coords: LOCATIONS_DATA[fullSearchStr], level: 'ciudad' };
  }

  // Fallback: ciudad → depto → provincia → pais
  const levels = ['ciudad', 'departamento', 'provincia', 'pais'];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const coords = (LOCATIONS_DATA[part] && LOCATIONS_DATA[part][0] !== 0) ? LOCATIONS_DATA[part] : PROVINCE_COORDS[part];
    
    if (coords) {
      return { coords: coords, level: levels[i] || 'pais' };
    }
  }

  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function initProfileMap(viewedData) {
  const mapSection = document.getElementById('profile-map-section');
  const mapContainer = document.getElementById('profile-map');
  if (!mapSection || !mapContainer) return;

  // Resolver coords del usuario que estamos viendo
  const viewedResult = resolveCoords(viewedData);
  if (!viewedResult) return;

  const viewedCoords = viewedResult.coords;
  const zoomMap = { exact: 13, ciudad: 13, departamento: 10, provincia: 8, pais: 5 };
  let zoom = zoomMap[viewedResult.level] || 12;

  // Mostrar sección
  mapSection.style.display = 'block';

  const profileMap = L.map('profile-map', {
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: false,
    preferCanvas: true // Renderizar en canvas ayuda a html2canvas
  }).setView(viewedCoords, zoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    crossOrigin: true // Requerido para capturas de pantalla con html2canvas
  }).addTo(profileMap);

  // Marcador del usuario visto (naranja)
  L.circle(viewedCoords, {
    radius: zoom >= 13 ? 500 : zoom >= 10 ? 5000 : 30000,
    color: '#f90', fillColor: '#f90', fillOpacity: 0.15, weight: 1
  }).addTo(profileMap);

  L.circleMarker(viewedCoords, {
    radius: 6, fillColor: '#f90', color: '#fff', weight: 2, fillOpacity: 1
  }).addTo(profileMap);

  // --- Cálculo de distancia con el usuario logueado ---
  const myAlias = localStorage.getItem('alias');
  if (myAlias && myAlias !== viewedData.alias) {
    try {
      const myDocSnap = await getDoc(doc(db, 'users', myAlias));
      if (myDocSnap.exists()) {
        const myData = myDocSnap.data();
        const myResult = resolveCoords(myData);

        if (myResult) {
          const myCoords = myResult.coords;
          const distKm = haversineKm(myCoords[0], myCoords[1], viewedCoords[0], viewedCoords[1]);

          // Mostrar info de distancia en el contenedor dedicado
          const distInfo = document.getElementById('distance-info');
          if (distInfo) {
            const myLocation = [myData.ciudad, myData.provincia].filter(Boolean).join(', ') || 'Tu ubicación';
            const viewedLocation = [viewedData.ciudad, viewedData.provincia].filter(Boolean).join(', ') || 'Su ubicación';
            
            // Separar valor y unidad para mejor diseño
            let distValue, distUnit;
            if (distKm < 1) {
              distValue = Math.round(distKm * 1000);
              distUnit = 'm';
            } else if (distKm < 100) {
              distValue = distKm.toFixed(1);
              distUnit = 'km';
            } else {
              distValue = Math.round(distKm);
              distUnit = 'km';
            }

            distInfo.innerHTML = `
              <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 12px; background: linear-gradient(135deg, rgba(255,153,0,0.08), rgba(255,176,0,0.04)); border: 1px solid rgba(255,176,0,0.3); border-radius: 8px; font-family: 'Share Tech Mono', monospace;">
                <!-- UBICACIÓN MÍA -->
                <div style="text-align: left; min-width: 0;">
                  <div style="font-size: 0.65em; color: #0f0; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">⬤ Vos</div>
                  <div style="font-size: 0.75em; color: var(--secondary, #a67200); line-height: 1.2; word-wrap: break-word; opacity: 0.9;">${myLocation}</div>
                </div>
                
                <!-- DISTANCIA -->
                <div style="text-align: center; padding: 0 14px; border-left: 1px solid rgba(255,176,0,0.15); border-right: 1px solid rgba(255,176,0,0.15); min-width: 80px;">
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="font-size: 1.6em; font-weight: bold; color: #ffcc00; text-shadow: 0 0 10px rgba(255,204,0,0.4); line-height: 1;">~${distValue}</div>
                    <div style="font-size: 0.85em; font-weight: bold; color: #ffcc00; text-transform: uppercase; margin-top: -2px;">${distUnit}</div>
                    <div style="font-size: 0.55em; letter-spacing: 1.5px; color-interpolation-filters: linearRGB; color: rgba(255,176,0,0.6); text-transform: uppercase; margin-top: 4px; white-space: nowrap;">distancia aprox.</div>
                  </div>
                </div>
                
                <!-- UBICACIÓN OTRO -->
                <div style="text-align: right; min-width: 0;">
                  <div style="font-size: 0.65em; color: #f90; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">⬤ ${viewedData.alias || 'Usuario'}</div>
                  <div style="font-size: 0.75em; color: var(--secondary, #a67200); line-height: 1.2; word-wrap: break-word; opacity: 0.9;">${viewedLocation}</div>
                </div>
              </div>
            `;
          }

          // Dibujar línea de conexión
          L.polyline([myCoords, viewedCoords], {
            color: '#ffcc00', weight: 1.5, opacity: 0.4, dashArray: '8, 10'
          }).addTo(profileMap);

          // Marcador del usuario logueado (verde)
          L.circleMarker(myCoords, {
            radius: 6, fillColor: '#0f0', color: '#0f0', weight: 2, fillOpacity: 0.9
          }).addTo(profileMap);

          // Ajustar vista para mostrar ambos puntos
          profileMap.fitBounds(L.latLngBounds(myCoords, viewedCoords).pad(0.3));

          if (window.lucide) lucide.createIcons();
        }
      }
    } catch (e) {
      console.warn('No se pudo calcular distancia:', e);
    }
  }

  setTimeout(() => profileMap.invalidateSize(), 200);
}
