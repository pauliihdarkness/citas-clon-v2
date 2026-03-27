import { db, auth, collection, getDocs, query, orderBy, onSnapshot, onAuthStateChanged, getDoc, doc } from './firebase-config.js';
import { escapeHtml, truncateText, formatTime, formatRelativeTime } from './utils.js';
import { observeLazyImages, debounce, markTime, measureTime } from './performance-optimizer.js';
import './activity-tracker.js'; // Rastreo automático de actividad

const convList = document.getElementById('conversations');
const convMessages = document.getElementById('conversation-messages');
const chatHeader = document.getElementById('chat-header');
const chatTitle = document.getElementById('chat-title');
const chatStatus = document.getElementById('chat-status');
const chatContainer = document.querySelector('.chat-container');
const chatBackBtn = document.getElementById('chat-back-btn');

markTime('chat-start');

// Cache de datos de usuario (foto, lastSeen)
const userDataCache = new Map();

function getSafeImageUrl(url, alias) {
    const name = alias || '?';
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b1220&color=ffa500&size=400`;
    if (!url || typeof url !== 'string') return fallback;
    if (!url.startsWith('http') && !url.startsWith('data:')) return fallback;
    return url;
}

async function fetchUserData(alias) {
    if (userDataCache.has(alias)) return userDataCache.get(alias);
    try {
        const userDoc = await getDoc(doc(db, "users", alias));
        if (userDoc.exists()) {
            const data = userDoc.data();
            userDataCache.set(alias, data);
            return data;
        }
    } catch (e) {
        console.warn('No se pudo obtener datos del usuario:', alias, e);
    }
    return null;
}

/**
 * Parsea un ID de conversación (ej: "CHU8_GALA") y devuelve los dos participantes
 */
function parseConvParticipants(convId) {
    const parts = convId.split('_');
    if (parts.length === 2) return parts;
    // Si hay más de un "_", intentamos separar por el alias del usuario actual
    const myAlias = currentUser?.alias;
    if (myAlias && convId.includes(myAlias)) {
        const other = convId.replace(myAlias, '').replace(/^_|_$/g, '');
        return [myAlias, other];
    }
    return [convId];
}

/**
 * Obtiene el nombre del otro participante para mostrar en el sidebar
 */
function getOtherUserName(convId) {
    const parts = parseConvParticipants(convId);
    const myAlias = currentUser?.alias;
    if (parts.length === 2) {
        return parts[0] === myAlias ? parts[1] : parts[0];
    }
    return convId;
}

/**
 * Formatea el ID de conversación para el header (ej: "CHU8 ↔ GALA")
 */
function formatConvTitle(convId) {
    const parts = parseConvParticipants(convId);
    if (parts.length === 2) {
        return `${parts[0]} ↔ ${parts[1]}`;
    }
    return convId;
}

let currentUser = null;
let currentConvId = null;
let conversaciones = {};
let conversacionActiva = null;

// Obtener usuario logueado
onAuthStateChanged(auth, (user) => {
  console.log('[AUTH] Verificando estado de autenticación...');
  if (user) {
    console.log('[AUTH] ✓ Usuario autenticado:', user.email || user.uid);
    
    // Obtener alias desde localStorage para compatibilidad con chat-personal
    const alias = localStorage.getItem('alias');
    currentUser = { ...user, alias: alias };
    
    loadConversations();
  } else {
    console.log('[AUTH] ✗ Usuario no autenticado, redirigiendo a login...');
    window.location.replace('./login.html');
  }
});

/**
 * Obtiene los mensajes de una conversación (ordenados por timestamp)
 */
async function obtenerMensajesDeConversacion(conversationId) {
  try {
    const msgsCol = collection(db, 'conversaciones', conversationId, 'mensajes');
    const q = query(msgsCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn(`[MENSAJES] No hay mensajes en conversación ${conversationId}`);
      return [];
    }

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`[MENSAJES] Error obteniendo mensajes de ${conversationId}:`, e.message);
    return [];
  }
}

/**
 * Guarda en caché local
 */
function guardarEnCache(conversaciones) {
  localStorage.setItem("conversacionesCache", JSON.stringify({
    timestamp: Date.now(),
    data: conversaciones
  }));
}

/**
 * Carga desde caché (si existe y no está vencido)
 */
function cargarDesdeCache() {
  const cache = localStorage.getItem("conversacionesCache");
  if (!cache) return null;
  try {
    const { data, timestamp } = JSON.parse(cache);
    const expiracion = 10 * 60 * 1000; // 10 minutos
    if (Date.now() - timestamp > expiracion) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Carga todas las conversaciones del usuario
 */
async function loadConversations() {
  console.log('[CONVERSACIONES] Iniciando carga de todas las conversaciones...');
  if (!convList) {
    console.error('[CONVERSACIONES] ✗ ERROR: Elemento #conversations no encontrado en el DOM');
    return;
  }

  try {
    convList.innerHTML = '<p class="loading">Cargando conversaciones...</p>';

    // 1️⃣ Cargar desde caché primero
    const cacheData = cargarDesdeCache();
    if (cacheData) {
      conversaciones = cacheData;
      renderListaConversaciones(Object.keys(conversaciones));
      console.log("💾 Conversaciones cargadas desde caché");
    }

    // 2️⃣ Suscribirse en tiempo real a la colección "conversaciones"
    const convRef = collection(db, 'conversaciones');
    onSnapshot(convRef, async (convSnap) => {
      console.log(`[CONVERSACIONES] Detectadas ${convSnap.docs.length} conversaciones`);

      const resultados = await Promise.all(
        convSnap.docs.map(async conv => {
          const conversationId = conv.id;
          const mensajes = await obtenerMensajesDeConversacion(conversationId);
          console.log(`[CONVERSACIONES] Conversación ${conversationId}: ${mensajes.length} mensajes`);
          return { conversationId, mensajes };
        })
      );

      conversaciones = Object.fromEntries(
        resultados.map(({ conversationId, mensajes }) => [conversationId, mensajes])
      );

      guardarEnCache(conversaciones);
      renderListaConversaciones(Object.keys(conversaciones));
      console.log(`✓ ${Object.keys(conversaciones).length} conversaciones cargadas`);
    }, (error) => {
      console.error('[CONVERSACIONES] Error en listener:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permisos insuficientes. Verifica las reglas de Firestore.');
        convList.innerHTML = '<p class="error">Error de permisos. Verifica las reglas de Firestore.</p>';
      }
    });
  } catch (e) {
    console.error('[CONVERSACIONES] ✗ ERROR crítico:', e);
    convList.innerHTML = '<p class="error">Error: ' + escapeHtml(e.message) + '</p>';
  }
}

/**
 * Renderiza lista de conversaciones
 */
function renderListaConversaciones(conversacionesIds, searchTerm = '') {
  console.log('[RENDERIZADO] Renderizando', conversacionesIds.length, 'conversaciones');
  convList.innerHTML = "";

  if (conversacionesIds.length === 0) {
    convList.innerHTML = '<p class="empty">No hay conversaciones aún.</p>';
    return;
  }

  // Ordenar conversaciones por último mensaje
  const idsOrdenados = [...conversacionesIds].sort((a, b) => {
    const mensajesA = conversaciones[a] || [];
    const mensajesB = conversaciones[b] || [];

    if (!mensajesA.length) return 1;
    if (!mensajesB.length) return -1;

    const fechaA = mensajesA[mensajesA.length - 1]?.timestamp?.seconds || 0;
    const fechaB = mensajesB[mensajesB.length - 1]?.timestamp?.seconds || 0;

    return fechaB - fechaA;
  });

  // Filtrar por término de búsqueda
  const term = searchTerm.toLowerCase();
  const filteredIds = idsOrdenados.filter(convId => {
    if (!term) return true;
    const mensajes = conversaciones[convId] || [];
    const ultimo = mensajes[mensajes.length - 1];
    const snippet = (ultimo?.text || ultimo?.contenido || "");
    return convId.toLowerCase().includes(term) || snippet.toLowerCase().includes(term);
  });

  if (filteredIds.length === 0) {
    convList.innerHTML = '<p class="empty">No se encontraron conversaciones.</p>';
    return;
  }

  filteredIds.forEach(convId => {
    const mensajes = conversaciones[convId] || [];
    if (!mensajes.length) return;

    const ultimo = mensajes[mensajes.length - 1];
    const tiempo = formatRelativeTime(ultimo.timestamp);
    const snippet = (ultimo.text || ultimo.contenido || "").slice(0, 40) + ((ultimo.text || ultimo.contenido || "").length > 40 ? "…" : "");

    // Para la lista global, mostramos ambos participantes
    const displayTitle = formatConvTitle(convId);
    
    // Para el avatar, tratamos de sacar el del último que escribió o uno de los dos
    const parts = parseConvParticipants(convId);
    let avatarUser = ultimo.from || ultimo.remitente;
    if (!avatarUser) {
        avatarUser = (parts[0] === currentUser?.alias && parts.length > 1) ? parts[1] : parts[0];
    }
    
    const placeholderImg = getSafeImageUrl(null, avatarUser);

    const div = document.createElement("div");
    div.className = "conv-item";

    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
        <img src="${placeholderImg}" alt="${escapeHtml(avatarUser)}" class="conv-avatar"
          style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--border);
          filter: sepia(1) saturate(5) hue-rotate(-20deg) contrast(1.2); flex-shrink: 0; object-fit: cover;" />
        <div style="flex: 1; min-width: 0; overflow: hidden;">
          <div class="conv-title">${escapeHtml(displayTitle)}</div>
          <div class="conv-preview">${escapeHtml(snippet)}</div>
        </div>
        <div class="conv-time">${tiempo}</div>
      </div>
    `;

    div.addEventListener("click", () => {
      document.querySelectorAll('.conv-item').forEach(c => c.classList.remove('active'));
      div.classList.add('active');
      mostrarConversacion(convId);
    });

    convList.appendChild(div);

    // Cargar foto real en segundo plano
    fetchUserData(avatarUser).then(userData => {
      if (userData) {
        const img = div.querySelector('.conv-avatar');
        if (img && userData.fotoPerfilUrl) {
          img.src = getSafeImageUrl(userData.fotoPerfilUrl, avatarUser);
        }
        const titleEl = div.querySelector('.conv-title');
        if (titleEl && userData.membresia === true) {
          titleEl.innerHTML = `${escapeHtml(displayTitle)} <i data-lucide="crown" style="width:12px;height:12px;vertical-align:middle;"></i>`;
          titleEl.classList.add('premium-text');
          if (window.lucide) lucide.createIcons();
        }
      }
    });
  });
}

/**
 * Muestra mensajes de una conversación
 */
function mostrarConversacion(conversationId) {
  console.log('[MENSAJES] Mostrando conversación:', conversationId);
  conversacionActiva = conversationId;

  if (!convMessages) {
    console.error('[MENSAJES] ✗ ERROR: Elemento #conversation-messages no encontrado');
    return;
  }

  // Mostrar header
  if (chatHeader) {
    chatHeader.style.display = 'flex';
    chatTitle.textContent = formatConvTitle(conversationId);
    chatStatus.innerHTML = '<i data-lucide="message-circle"></i> Chat abierto';
    lucide.createIcons();
  }

  // Mobile: activar vista de chat
  if (chatContainer) chatContainer.classList.add('chat-open');

  let mensajes = conversaciones[conversationId] || [];

  // Ordenar mensajes por timestamp
  mensajes = mensajes.sort((a, b) => {
    const timeA = a.timestamp?.seconds || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
    const timeB = b.timestamp?.seconds || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
    return timeA - timeB;
  });

  console.log(`[MENSAJES] Renderizando ${mensajes.length} mensajes`);

  convMessages.innerHTML = "";

  if (mensajes.length === 0) {
    convMessages.innerHTML = '<p class="empty">No hay mensajes en esta conversación.</p>';
    return;
  }

  mensajes.forEach((msg, index) => {
    console.log(`[MENSAJES] Renderizando mensaje ${index + 1}/${mensajes.length}`);
    const msgEl = createMessageElement(msg);
    convMessages.appendChild(msgEl);
  });

  // Lazy load de imágenes en mensajes
  observeLazyImages();

    setTimeout(() => {
      convMessages.scrollTop = convMessages.scrollHeight;
      console.log('[MENSAJES] ✓ Scroll al final completado');
      
      // Reiniciar iconos para todos los mensajes
      if (window.lucide) lucide.createIcons();
      
      measureTime('💬 Conversación cargada', 'chat-start');
    }, 0);

  console.log(`[MENSAJES] ✓ COMPLETADO: ${mensajes.length} mensajes cargados`);
}

/**
 * Crea un elemento visual para un mensaje
 */
function createMessageElement(msg) {
  const div = document.createElement('div');
  div.className = 'message-item';

  const isOwnMessage = msg.from === currentUser?.uid || 
                       msg.from === currentUser?.email || 
                       (msg.remitente && currentUser?.alias && msg.remitente === currentUser.alias);
                       
  if (isOwnMessage) {
    div.classList.add('own-message');
  }

  const sender = msg.from || msg.remitente || 'Anónimo';
  const text = msg.text || msg.contenido || '(Sin contenido)';
  const time = formatTime(msg.timestamp);
  const placeholderImg = getSafeImageUrl(null, sender);

  div.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: flex-start; width: 100%;">
      <img src="${placeholderImg}" alt="${escapeHtml(sender)}" class="msg-avatar"
        data-user-alias="${escapeHtml(sender)}"
        style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--border);
        filter: sepia(1) saturate(5) hue-rotate(-20deg) contrast(1.2); flex-shrink: 0; object-fit: cover; margin-top: 2px;" />
      <div style="flex: 1; min-width: 0;">
        <div class="message-sender" style="font-weight: bold; margin-bottom: 2px;">${escapeHtml(sender)}</div>
        <div class="message-text">${escapeHtml(text)}</div>
        <div class="message-time">
          ${time}
          ${isOwnMessage ? (msg.leido ? '<i data-lucide="check-check" style="width:14px; height:14px; vertical-align: middle; margin-left: 4px;"></i>' : '<i data-lucide="check" style="width:14px; height:14px; vertical-align: middle; margin-left: 4px;"></i>') : ''}
        </div>
      </div>
    </div>
  `;

  // Cargar foto real del usuario en segundo plano
  fetchUserData(sender).then(userData => {
    if (userData) {
      const img = div.querySelector('.msg-avatar');
      if (img && userData.fotoPerfilUrl) {
        img.src = getSafeImageUrl(userData.fotoPerfilUrl, sender);
      }
      const senderEl = div.querySelector('.message-sender');
      if (senderEl && userData.membresia === true) {
         senderEl.innerHTML = `${escapeHtml(sender)} <i data-lucide="crown" style="width:12px;height:12px;vertical-align:middle;"></i>`;
         senderEl.classList.add('premium-text');
         if (window.lucide) lucide.createIcons();
      }
    }
  });

  return div;
}

/**
 * Escuchar cambios en tiempo real (listener para nuevos mensajes)
 */
function setupRealtimeListener(conversationId) {
  console.log('[LISTENER] Configurando listener de tiempo real para:', conversationId);
  try {
    const msgsCol = collection(db, 'conversaciones', conversationId, 'mensajes');
    const q = query(msgsCol, orderBy('timestamp', 'asc'));

    // Solo actualizar si seguimos en la misma conversación
    const unsubscribe = onSnapshot(q, (snap) => {
      if (conversacionActiva === conversationId) {
        console.log('[LISTENER] ✓ Cambios detectados en mensajes:', snap.docs.length, 'documentos');
        // Aquí podrías añadir lógica para actualizar solo los nuevos mensajes
      } else {
        console.log('[LISTENER] ⚠ Cambios en otra conversación, ignorando');
      }
    }, (e) => {
      console.warn('[LISTENER] ⚠ Listener de tiempo real falló:', e);
    });
  } catch (e) {
    console.warn('[LISTENER] ⚠ No se pudo configurar listener de tiempo real:', e);
  }
}

// Event listener para el buscador
const searchInput = document.getElementById('conversation-search');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    renderListaConversaciones(Object.keys(conversaciones), searchTerm);
  });
}

// Mobile: Botón de volver a la lista
if (chatBackBtn) {
  chatBackBtn.addEventListener('click', () => {
    if (chatContainer) chatContainer.classList.remove('chat-open');
  });
}
