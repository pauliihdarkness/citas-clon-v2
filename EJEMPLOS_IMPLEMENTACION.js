/**
 * EJEMPLOS DE IMPLEMENTACIÓN - Módulos de Optimización
 * 
 * ⚠️  IMPORTANTE: Estos son EJEMPLOS para diferentes archivos
 * No copiar TODAS las secciones juntas. Cada sección va en un archivo diferente.
 * 
 * Secciones:
 * 1️⃣  CACHE MANAGER → assets/js/feed.js
 * 2️⃣  AUTH MANAGER → assets/js/profile.js, chat.js, etc
 * 3️⃣  VISIBILITY MANAGER → assets/js/chat.js
 * 4️⃣  OPTIMIZAR IMÁGENES → assets/js/components/userCard.js
 * 5️⃣  DEBOUNCE FILTROS → assets/js/feed.js
 * 6️⃣  PAGINACIÓN → assets/js/feed.js (reemplaza loadMoreUsers)
 * 7️⃣  DEBUG → Consola del navegador
 */

// ============================================
// 1️⃣ USAR CACHE MANAGER EN feed.js
// ============================================
// Destino: assets/js/feed.js
// Copia: Estas líneas en tu archivo feed.js

import { db, collection, getDocs } from './firebase-config.js';
import { CacheManager } from './cache-manager.js';
import { createUserCard } from './components/userCard.js';

const cache = new CacheManager();
const feedContainer = document.getElementById('feed');
let allUsers = []; // Variable existente en feed.js

async function loadFeed() {
  try {
    feedContainer.innerHTML = '<p class="loading">Cargando perfiles...</p>';

    // 1. Intentar cargar desde caché primero
    console.log('⏳ Intentando cargar desde caché...');
    const cachedUsers = await cache.get('feed-users');
    
    if (cachedUsers && cachedUsers.length > 0) {
      allUsers = cachedUsers;
      renderFeed();
      console.log('✓ Feed cargado desde caché (inicial)');
    }

    // 2. Cargar desde Firestore en segundo plano
    console.log('⏳ Actualizando desde Firestore...');
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const freshUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Solo actualizar UI si hay cambios
    if (JSON.stringify(allUsers) !== JSON.stringify(freshUsers)) {
      allUsers = freshUsers;
      renderFeed();
      console.log('✓ Feed actualizado desde Firestore');
    }

    // 3. Guardar en caché por 30 minutos
    await cache.set('feed-users', allUsers, 30);
    console.log('💾 Datos guardados en caché');

  } catch (e) {
    console.error('Error cargando feed:', e);
    feedContainer.innerHTML = '<p class="error">Error cargando perfiles.</p>';
  }
}

// Llamar al cargar la página
loadFeed();


// ============================================
// 2️⃣ USAR AUTH MANAGER - Reemplaza en profile.js
// ============================================
// Destino: assets/js/profile.js, chat.js, chat-personal.js, feed.js
// Nota: Este es un EJEMPLO. Adaptar a cada archivo según sea necesario.

import authManager from './auth-manager.js';

// En lugar de:
// onAuthStateChanged(auth, (user) => { ... });

// Usar:
authManager.subscribe((user) => {
  if (!user) {
    console.log('No autenticado, redirigiendo...');
    window.location.replace('./login.html');
  } else {
    console.log('Usuario autenticado:', user.email);
    loadProfile(user); // O loadChat(), loadFeed(), etc según el archivo
  }
});

// Logout simplificado (usar en cualquier archivo que tenga logoutBtn)
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    await authManager.logout();
    window.location.replace('./login.html');
  } catch (e) {
    console.error('Error en logout:', e);
  }
});


// ============================================
// 3️⃣ USAR VISIBILITY MANAGER EN chat.js
// ============================================
// Destino: assets/js/chat.js
// Copia: Estas líneas en tu archivo chat.js

import visibilityManager from './visibility-manager.js';
import { db, collection, onSnapshot } from './firebase-config.js';

let unsubscribeMessages = null; // Variable local en chat.js

// Registrar listener de mensajes
visibilityManager.register(
  'chat-messages',
  
  // onActivate: Esto se ejecuta cuando la pestaña es visible
  () => {
    console.log('[CHAT] Activando listener de mensajes...');
    
    unsubscribeMessages = onSnapshot(
      collection(db, 'conversaciones'),
      (snap) => {
        console.log(`[CHAT] ${snap.docs.length} conversaciones`);
        loadConversations(snap.docs);
      },
      (error) => {
        console.error('[CHAT] Error en listener:', error);
      }
    );

    // Retornar función para desuscribirse
    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
        console.log('[CHAT] Desuscrito de mensajes');
      }
    };
  },
  
  // onDeactivate: Esto se ejecuta cuando deactigas el listener (opcional)
  () => {
    console.log('[CHAT] Cleanup de chat...');
  }
);

// Activar cuando carga la página
visibilityManager.activate('chat-messages');


// ============================================
// 4️⃣ OPTIMIZAR IMÁGENES EN userCard.js
// ============================================
// Destino: assets/js/components/userCard.js
// Copia: Esta función createUserCard() reemplaza la existente

export function createUserCard(user, onClick = null) {
  const { id, alias, edad, ciudad, provincia, fotoPerfilUrl } = user;
  const card = document.createElement('div');
  card.className = 'card-user';

  const locationParts = [ciudad, provincia].filter(Boolean);
  const locationText = locationParts.join(', ') || '';

  // Placeholder SVG optimizado (más ligero que imagen externa)
  const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e8e8e8' width='400' height='400'/%3E%3Ccircle cx='200' cy='150' r='50' fill='%23999'/%3E%3Cpath d='M100 250 Q200 200 300 250 L300 400 L100 400 Z' fill='%23999'/%3E%3C/svg%3E`;

  // Detección de soporte para WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  };

  // Optimizar URL con parámetros si es externa
  let imageUrl = fotoPerfilUrl || placeholderSvg;
  if (fotoPerfilUrl && (fotoPerfilUrl.includes('cloudinary') || fotoPerfilUrl.includes('firebase'))) {
    // Añadir parámetros de optimización
    const separator = fotoPerfilUrl.includes('?') ? '&' : '?';
    imageUrl = `${fotoPerfilUrl}${separator}w=400&h=400&fit=cover&q=75`;
    
    if (supportsWebP()) {
      imageUrl += '&f=webp';
    }
  }

  card.innerHTML = `
    <div class="user-photo">
      <img 
        src="${imageUrl}" 
        alt="${alias || 'User'}" 
        loading="lazy"
        decoding="async"
        width="400"
        height="400"
        onerror="this.src='${placeholderSvg}'"
      />
    </div>
    <div class="user-info">
      <h3>${alias || 'Sin nombre'} ${edad ? ',' + edad : ''}</h3>
      <p>${locationText}</p>
    </div>
  `;

  card.addEventListener('click', () => {
    if (onClick) return onClick(user);
    window.location.href = `./user-profile.html?id=${id}`;
  });

  return card;
}


// ============================================
// 5️⃣ DEBOUNCE AVANZADO PARA FILTROS
// ============================================
// Destino: assets/js/feed.js
// Copia: Crear la clase FilterManager y usarla en feed.js

class FilterManager {
  constructor(onFilterChange, delayMs = 500) {
    this.onFilterChange = onFilterChange;
    this.delayMs = delayMs;
    this.timeouts = {};
    this.filterValues = {};
  }

  debounce(filterName, callback) {
    clearTimeout(this.timeouts[filterName]);
    this.timeouts[filterName] = setTimeout(() => {
      callback();
      this.onFilterChange();
    }, this.delayMs);
  }

  setupListeners() {
    // Text inputs
    ['searchAlias', 'searchCiudad', 'searchEdad'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          this.filterValues[id] = e.target.value;
          this.debounce(id, () => {
            console.log(`🔍 Filtro: ${id} = "${e.target.value}"`);
          });
        });
      }
    });

    // Checkboxes
    ['filterMembresia', 'filterOnline', 'filterVerified'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.filterValues[id] = e.target.checked;
          this.debounce(id, () => {
            console.log(`✓ Filtro: ${id} = ${e.target.checked}`);
          });
        });
      }
    });
  }

  getFilterValues() {
    return this.filterValues;
  }

  reset() {
    this.filterValues = {};
    ['searchAlias', 'searchCiudad', 'searchEdad'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['filterMembresia', 'filterOnline', 'filterVerified'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
  }
}

// Usar en feed.js
const filterManager = new FilterManager(() => renderFeed(), 800);
filterManager.setupListeners();


// ============================================
// 6️⃣ PAGINACIÓN CON CURSOR
// ============================================
// Destino: assets/js/feed.js
// Nota: Esta sección REEMPLAZA/MODIFICA la función loadMoreUsers() y relacionadas
// NO declarar allUsers nuevamente - ya existe en feed.js

import { db, collection, getDocs, query, limit, startAfter } from './firebase-config.js';

// Constantes para paginación (agregar al inicio de feed.js)
const PAGE_SIZE = 12; // Usuaries por página
// let allUsers = []; ← YA EXISTE, NO AGREGAR
let lastDocument = null;
let isLoading = false;
let hasMore = true;

async function loadMoreUsers() {
  if (isLoading || !hasMore) return;
  isLoading = true;

  try {
    const usersCol = collection(db, 'users');
    let q = query(usersCol, limit(PAGE_SIZE + 1));
    
    if (lastDocument) {
      q = query(usersCol, startAfter(lastDocument), limit(PAGE_SIZE + 1));
    }

    const snap = await getDocs(q);
    const docs = snap.docs;

    if (docs.length === 0) {
      hasMore = false;
      console.log('✓ Se alcanzó el final de usuaries');
      return;
    }

    // Guardar cursor para siguiente página
    if (docs.length > PAGE_SIZE) {
      lastDocument = docs[PAGE_SIZE - 1];
      hasMore = true;
    } else {
      hasMore = false;
    }

    const newUsers = docs.slice(0, PAGE_SIZE).map(d => ({ id: d.id, ...d.data() }));
    allUsers.push(...newUsers);
    
    console.log(`✓ Cargados ${newUsers.length} usuaries. Total: ${allUsers.length}`);
    renderFeed();

  } catch (e) {
    console.error('Error cargando usuaries:', e);
    hasMore = false;
  } finally {
    isLoading = false;
  }
}

// Iniciar
async function loadFeed() {
  allUsers = [];
  lastDocument = null;
  hasMore = true;
  await loadMoreUsers();
}

// Botón "Cargar más"
document.getElementById('load-more-btn')?.addEventListener('click', () => {
  console.log('Cargando más usuaries...');
  loadMoreUsers();
});

// O infinite scroll (cargar más cuando scroll llega al final)
window.addEventListener('scroll', async () => {
  if (isLoading || !hasMore) return;

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

  if (distanceFromBottom < 1000) { // 1000px antes del final
    await loadMoreUsers();
  }
});


// ============================================
// 7️⃣ DEBUG - Ver estado de todo
// ============================================
// Destino: Consola del navegador (F12)
// Copia: Pega estas líneas directamente en la consola para debuggear

// Ver estado de autenticación
authManager.debug();

// Ver estado de visibility listeners
visibilityManager.debug();

// Ver estadísticas de caché
cache.getStats().then(stats => console.log(stats));

// Ver valores de filtros
filterManager.getFilterValues();
