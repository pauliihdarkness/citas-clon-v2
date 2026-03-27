import { db, collection, getDocs } from './firebase-config.js';
import { renderUserCards, createUserCard } from './components/userCard.js';
import { debounce, observeLazyImages, clearMemoCache, markTime, measureTime } from './performance-optimizer.js';
import { showLoadingSkeletons } from './skeleton-loader.js';
import './activity-tracker.js'; // Rastreo automático de actividad

const feedContainer = document.getElementById('feed');

markTime('feed-start');

let allUsers = [];

async function loadFeed() {
  try {
    markTime('load-feed-start');
    
    // Mostrar loading centrado en pantalla
    feedContainer.innerHTML = '<div class="loading-message-overlay">Cargando perfiles...</div>';

    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Ordenar por más recientes primero
    allUsers.sort((a, b) => {
      const dateA = a.creadoEn?.seconds || 0;
      const dateB = b.creadoEn?.seconds || 0;
      return dateB - dateA;
    });

    measureTime('📥 Usuaries cargades', 'load-feed-start');
    renderFeed();
    setupFilters();
  } catch (e) {
    console.error('Error cargando feed', e);
    feedContainer.innerHTML = '<p class="error">Error cargando perfiles.</p>';
  }
}

/**
 * Renderiza el feed con filtros aplicados y separadores de fecha
 * Usa lazy loading e performance monitoring
 */
function renderFeed() {
  markTime('render-feed-start');
  const aliasFilter = document.getElementById("searchAlias")?.value.toLowerCase() || "";
  const ciudadFilter = document.getElementById("searchCiudad")?.value.toLowerCase() || "";
  const edadFilter = document.getElementById("searchEdad")?.value || "";
  const membresiaFilter = document.getElementById("filterMembresia")?.checked || false;
  const onlineFilter = document.getElementById("filterOnline")?.checked || false;
  const platformFilter = document.getElementById("filterPlatform")?.checked || false;

  const filteredUsers = allUsers.filter((user) => {
    // Usuario debe tener alias
    if (!user.alias || user.alias.trim() === "") return false;

    const aliasMatch = user.alias.toLowerCase().includes(aliasFilter);

    const ciudadMatch = ciudadFilter === "" ||
      (user.ciudad || "").toLowerCase().includes(ciudadFilter) ||
      (user.provincia || "").toLowerCase().includes(ciudadFilter) ||
      (user.pais || "").toLowerCase().includes(ciudadFilter);

    const edadMatch = edadFilter ? String(user.edad) === String(edadFilter) : true;
    const membresiaMatch = membresiaFilter ? user.membresia === true : true;
    const onlineMatch = onlineFilter ? user.isOnline === true : true;
    const platformMatch = platformFilter ? user.platform : true;

    return aliasMatch && ciudadMatch && edadMatch && membresiaMatch && onlineMatch && platformMatch;
  });

  console.log(`📊 Filtrados: ${filteredUsers.length} / ${allUsers.length} usuaries`);

  const userCountEl = document.getElementById('user-count');
  if (userCountEl) {
    userCountEl.textContent = `(${filteredUsers.length})`;
    userCountEl.style.color = 'var(--secondary)';
    userCountEl.style.fontSize = '0.8em';
  }

  feedContainer.innerHTML = '';

  if (filteredUsers.length === 0) {
    feedContainer.innerHTML = '<p class="empty">No hay perfiles que coincidan con los filtros.</p>';
    return;
  }

  // Agrupar por fecha de creación
  const usersByDate = {};

  filteredUsers.forEach(user => {
    let dateKey = 'Fecha desconocida';
    if (user.creadoEn) {
      const dateObj = user.creadoEn.seconds ? new Date(user.creadoEn.seconds * 1000) : new Date(user.creadoEn);
      // Validar que la fecha sea válida
      if (!isNaN(dateObj.getTime())) {
        // Resetear horas para comparar fechas
        dateObj.setHours(0, 0, 0, 0);
        dateKey = dateObj.toISOString(); // usar ISO para ordenar correctamente
      }
    }

    if (!usersByDate[dateKey]) {
      usersByDate[dateKey] = [];
    }
    usersByDate[dateKey].push(user);
  });

  // Ordenar fechas descendente
  const sortedDates = Object.keys(usersByDate).sort((a, b) => {
    if (a === 'Fecha desconocida') return 1;
    if (b === 'Fecha desconocida') return -1;
    return new Date(b) - new Date(a);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  sortedDates.forEach(dateKey => {
    // Crear header de fecha
    let label = dateKey;
    if (dateKey !== 'Fecha desconocida') {
      const dateObj = new Date(dateKey);
      if (dateObj.getTime() === today.getTime()) {
        label = 'Hoy';
      } else if (dateObj.getTime() === yesterday.getTime()) {
        label = 'Ayer';
      } else {
        label = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        // Capitalizar primera letra
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
    }

    const separator = document.createElement('h3');
    separator.className = 'feed-date-separator';
    separator.innerHTML = `<i data-lucide="calendar"></i> ${label}`;
    feedContainer.appendChild(separator);

    // Renderizar usuaries de esa fecha
    usersByDate[dateKey].forEach(user => {
      const card = createUserCard(user);
      feedContainer.appendChild(card);
    });
  });

  // Lazy load de imágenes
  observeLazyImages();

  // Re-inicializar iconos despues de inyectar todo
  if (window.lucide) {
    lucide.createIcons();
  }

  measureTime('🎨 Feed renderizado', 'render-feed-start');
}

/**
 * Configura los listeners de filtros
 * Usa debounce mejorado para mejor rendimiento
 */
function setupFilters() {
  const debouncedRender = debounce(renderFeed, 350);
  const debouncedClear = debounce(() => clearMemoCache('search'), 500);

  const filterInputs = [
    document.getElementById("searchAlias"),
    document.getElementById("searchCiudad"),
    document.getElementById("searchEdad"),
    document.getElementById("filterMembresia"),
    document.getElementById("filterOnline"),
    document.getElementById("filterPlatform")
  ];

  filterInputs.forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        debouncedRender();
        debouncedClear();
      });
      input.addEventListener("change", renderFeed);
    }
  });

  // Botón limpiar filtros
  const clearBtn = document.getElementById("clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      filterInputs.forEach(input => {
        if (input.type === "checkbox") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
      clearMemoCache('search');
      renderFeed();
    });
  }
}

if (feedContainer) loadFeed();
