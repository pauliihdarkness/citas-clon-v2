import { db, auth, collection, query, where, orderBy, limit, onSnapshot, addDoc, setDoc, doc, updateDoc, getDoc, getDocs, serverTimestamp } from './firebase-config.js';
import { onAuthStateChanged } from './firebase-config.js';
import { showToast, formatRelativeTime } from './utils.js';
import { observeLazyImages, debounce, markTime, measureTime } from './performance-optimizer.js';
import notifications from './notifications.js';
import './activity-tracker.js'; // Rastreo automático de actividad

markTime('chat-personal-start');

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
    if (!alias) return null;
    if (userDataCache.has(alias)) return userDataCache.get(alias);
    
    try {
        // Buscar por el campo 'alias' ya que el ID de documento es el UID
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("alias", "==", alias), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            userDataCache.set(alias, data);
            return data;
        }
    } catch (e) {
        console.warn('No se pudo obtener datos del usuario por alias:', alias, e);
    }
    return null;
}

// DOM Elements
const conversationsList = document.getElementById('conversations-list');
const chatArea = document.getElementById('chat-area');
const emptyState = document.getElementById('empty-state');
const chatTitle = document.getElementById('chat-title');
const chatPhoto = document.getElementById('chat-photo');
const chatStatus = document.getElementById('chat-status');
const messagesBox = document.getElementById('messages-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const searchInput = document.getElementById('conversation-search');
const chatContainer = document.querySelector('.chat-container');
const chatBackBtn = document.getElementById('chat-back-btn');

let currentUser = null;
let currentConversationId = null;
let currentChatUserAlias = null; // Alias del usuario con el que estamos chateando actualmente
let unsubscribeMessages = null;

// Inicialización
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // 1. Obtener perfil del usuario por su UID (que es el ID del documento en Firestore)
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const alias = userData.alias || localStorage.getItem('alias');

                if (!alias) {
                    notifications.show('⚠️ ALIAS_NO_CONFIGURADO: Por favor, ve a Perfil.', 'warning');
                    // Redirigir a creación si no hay alias
                    // window.location.href = 'create-profile.html';
                    return;
                }

                currentUser = { uid: user.uid, alias: alias, ...userData };
                
                // Asegurar que localStorage tenga el alias correcto
                localStorage.setItem('alias', alias);

                console.log('✅ SESIÓN_CHAT_INICIALIZADA para:', alias);

                // Check for URL param (chatear con alguien específico)
                const params = new URLSearchParams(window.location.search);
                const targetAlias = params.get('id');

                if (targetAlias) {
                    await initiateChatWith(targetAlias);
                }

                loadConversations();
            } else {
                console.warn("⚠️ No se encontró perfil en Firestore para UID:", user.uid);
                alert('No tienes un perfil creado todavía. Por favor, crea uno.');
                window.location.href = 'create-profile.html';
            }
        } catch (error) {
            console.error('❌ Error inicializando chat:', error);
            alert('Error de conexión con el sistema.');
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function initiateChatWith(targetAlias) {
    if (targetAlias === currentUser.alias) return;

    // Verificar si el destinatario existe en el sistema
    const targetUser = await fetchUserData(targetAlias);
    if (!targetUser) {
        console.warn('⚠️ Intento de chat con alias inexistente:', targetAlias);
        notifications.show('❌ El usuario no existe en la red SYS.', 'error');
        return;
    }

    // Check if conversation already exists
    // Format: alias1_alias2 (sorted)
    const participants = [currentUser.alias, targetAlias].sort();
    const convId = participants.join('_');

    // Check local list later or just check firestore now
    const convRef = doc(db, "conversaciones", convId);
    const convSnap = await getDoc(convRef);

    if (!convSnap.exists()) {
        // Create new
        await setDoc(convRef, {
            participantes: participants,
            timestamp: serverTimestamp(),
            ultimoMensaje: ''
        });
    }

    // Open it
    // We construct a temporary conv object to open immediately
    await openConversation({ id: convId, participantes: participants, timestamp: { seconds: Date.now() / 1000 } }, targetAlias);
}

// Cargar conversaciones
function loadConversations() {
    const conversationsRef = collection(db, "conversaciones");
    // En un caso real, deberíamos filtrar donde el usuario está en 'participantes'
    // Como Firestore no soporta array-contains de forma simple con ordenamiento en algunos casos,
    // filtrar en cliente o índice compuesto es necesario.

    // Simplificación: Traemos todas y filtramos (CUIDADO EN PROD)
    // O mejor: query donde array-contains currentUser.alias

    const q = query(
        conversationsRef,
        where("participantes", "array-contains", currentUser.alias)
    );

    onSnapshot(q, (snapshot) => {
        const conversations = [];
        snapshot.forEach(docSnap => {
            const convData = { id: docSnap.id, ...docSnap.data() };
            conversations.push(convData);
            
            // Si la conversación actualizada es la que tenemos abierta, 
            // y tiene mensajes sin ver del otro usuario, marcarla como vista automáticamente
            if (currentConversationId === convData.id && !convData.visto && convData.ultimoRemitente !== currentUser.alias) {
                try {
                    const convRef = doc(db, "conversaciones", convData.id);
                    updateDoc(convRef, { visto: true });
                } catch (e) {
                    console.error("Error auto-marcando conversación como vista", e);
                }
            }
        });

        renderConversations(conversations);
    });
}

function renderConversations(conversations) {
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
        conversationsList.innerHTML = '<div class="empty">No tienes conversaciones.</div>';
        return;
    }

    // Filtrar con buscador
    const term = searchInput.value.toLowerCase();
    const filtered = conversations.filter(c => {
        const otherUser = getOtherParticipant(c);
        return otherUser.toLowerCase().includes(term);
    });

    // Ordenar por fecha (más reciente arriba)
    filtered.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
    });

    filtered.forEach(conv => {
        const otherUserAlias = getOtherParticipant(conv);
        const el = document.createElement('div');
        el.className = `conv-item ${currentConversationId === conv.id ? 'active' : ''}`;

        // Tiempo relativo simple
        const date = conv.timestamp ? new Date(conv.timestamp.seconds * 1000) : new Date();
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Placeholder inicial (se actualiza con datos reales)
        const placeholderImg = getSafeImageUrl(null, otherUserAlias);

        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                <img src="${placeholderImg}" alt="${otherUserAlias}" class="conv-avatar" 
                    style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--border); 
                    filter: sepia(1) saturate(5) hue-rotate(-20deg) contrast(1.2); flex-shrink: 0; object-fit: cover;" />
                <div style="flex: 1; min-width: 0; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <div class="conv-title">${otherUserAlias}</div>
                        ${(!conv.visto && conv.ultimoRemitente !== currentUser.alias) ? '<div class="conv-badge" style="width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 5px var(--accent); margin-left: 5px;"></div>' : ''}
                    </div>
                    <div class="conv-preview">${conv.ultimoMensaje || '...'}</div>
                    <div class="conv-lastseen" style="font-size: 0.7em; color: var(--secondary); opacity: 0.7; margin-top: 2px;"></div>
                </div>
                <div class="conv-time">${timeString}</div>
            </div>
        `;

        el.addEventListener('click', () => openConversation(conv, otherUserAlias));
        conversationsList.appendChild(el);

        // Cargar foto y lastSeen en segundo plano
        fetchUserData(otherUserAlias).then(userData => {
            if (userData) {
                const img = el.querySelector('.conv-avatar');
                if (img && userData.fotoPerfilUrl) {
                    img.src = getSafeImageUrl(userData.fotoPerfilUrl, otherUserAlias);
                }
                const tituloEl = el.querySelector('.conv-title');
                if (tituloEl && userData.membresia === true) {
                    tituloEl.innerHTML = `${escapeHtml(otherUserAlias)} <i data-lucide="crown" style="width:12px;height:12px;color:var(--accent);margin-left:2px;vertical-align:middle;"></i>`;
                    tituloEl.classList.add('premium-text');
                    if (window.lucide) lucide.createIcons();
                }
                const lastSeenEl = el.querySelector('.conv-lastseen');
                if (lastSeenEl && userData.lastSeen) {
                    const ts = userData.lastSeen.seconds ? userData.lastSeen.seconds * 1000 : userData.lastSeen;
                    lastSeenEl.textContent = '● ' + formatRelativeTime(new Date(ts));
                }
            }
        });
    });
}

function getOtherParticipant(conv) {
    return conv.participantes.find(p => p !== currentUser.alias) || 'Desconocido';
}

async function openConversation(conv, otherUserAlias) {
    currentConversationId = conv.id;
    currentChatUserAlias = otherUserAlias; // Guardar para navegación al perfil
    
    // Marcar como visto si el último mensaje no era mío
    if (!conv.visto && conv.ultimoRemitente !== currentUser.alias) {
        try {
            const convRef = doc(db, "conversaciones", conv.id);
            await updateDoc(convRef, { visto: true });
        } catch (e) {
            console.error("Error marcando conversación como vista", e);
        }
    }

    // UI Update
    chatArea.style.display = 'flex';
    emptyState.style.display = 'none';
    chatTitle.textContent = otherUserAlias;

    // Mobile: activar vista de chat
    if (chatContainer) chatContainer.classList.add('chat-open');

    // Actualizar lista para marcar activo
    const allItems = conversationsList.querySelectorAll('.conv-item');
    allItems.forEach(i => i.classList.remove('active'));

    // Cargar foto y estado real del usuario
    chatPhoto.src = getSafeImageUrl(null, otherUserAlias);
    chatStatus.textContent = '';

    const userData = await fetchUserData(otherUserAlias);
    if (userData) {
        if (userData.membresia === true) {
            chatTitle.innerHTML = `${escapeHtml(otherUserAlias)} <i data-lucide="crown" style="width:14px;height:14px;color:var(--accent);vertical-align:middle;"></i>`;
            chatTitle.classList.add('premium-text');
        } else {
            chatTitle.textContent = otherUserAlias;
            chatTitle.classList.remove('premium-text');
            if (window.lucide) lucide.createIcons();
        }

        chatPhoto.src = getSafeImageUrl(userData.fotoPerfilUrl, otherUserAlias);
        if (userData.lastSeen) {
            const ts = userData.lastSeen.seconds ? userData.lastSeen.seconds * 1000 : userData.lastSeen;
            chatStatus.textContent = 'Última vez: ' + formatRelativeTime(new Date(ts));
        } else {
            chatStatus.textContent = '';
        }
    }

    loadMessages(conv.id);
}

function loadMessages(conversationId) {
    messagesBox.innerHTML = '<div class="loading">Cargando...</div>';

    if (unsubscribeMessages) unsubscribeMessages();

    const messagesRef = collection(db, "conversaciones", conversationId, "mensajes");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesBox.innerHTML = '';

        if (snapshot.empty) {
            messagesBox.innerHTML = '<p class="empty">No hay mensajes. ¡Saluda!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            renderMessage(msg, doc.id);

            // Marcar como leído si es un mensaje recibido y no está leído
            if (msg.remitente !== currentUser.alias && !msg.leido) {
                markMessageAsRead(conversationId, doc.id);
            }
        });

        // Scroll to bottom
        messagesBox.scrollTop = messagesBox.scrollHeight;

        // Reiniciar iconos para todos los mensajes nuevos
        if (window.lucide) lucide.createIcons();
    });
}

// Marcar un mensaje como leído
async function markMessageAsRead(conversationId, messageId) {
    try {
        const msgRef = doc(db, "conversaciones", conversationId, "mensajes", messageId);
        await updateDoc(msgRef, { leido: true });
    } catch (error) {
        console.error("Error al marcar mensaje como leído:", error);
    }
}

function renderMessage(msg, id) {
    const div = document.createElement('div');
    const isMe = msg.remitente === currentUser.alias;

    div.className = `message-item ${isMe ? 'own-message' : ''}`;

    // Formato hora
    const date = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="message-sender">${isMe ? 'Tú' : msg.remitente}</div>
        <div class="message-text" style="white-space: pre-wrap;">${escapeHtml(msg.contenido)}</div>
        <div class="message-time">
            ${timeStr}
            ${isMe ? (msg.leido ? '<i data-lucide="check-check" style="width:14px; height:14px; vertical-align: middle; margin-left: 4px;"></i>' : '<i data-lucide="check" style="width:14px; height:14px; vertical-align: middle; margin-left: 4px;"></i>') : ''}
        </div>
    `;

    messagesBox.appendChild(div);
}

// Enviar mensaje
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentConversationId || !currentUser) return;

    messageInput.value = '';

    try {
        const messagesRef = collection(db, "conversaciones", currentConversationId, "mensajes");

        // Buscar quién es el destinatario
        // Obtenemos doc de conversacion actual para ver participantes
        // Ojo: esto asume participant[0] != me
        // Mejor pasarlo como argumento o guardarlo en scope.
        // Simplificamos: en openConversation ya sabiamos quien era 'otherUserAlias'
        const otherUserAlias = chatTitle.textContent;

        await addDoc(messagesRef, {
            remitente: currentUser.alias,
            destinatario: otherUserAlias,
            contenido: text,
            timestamp: serverTimestamp(),
            leido: false
        });

        // Actualizar último mensaje en la conversación
        const convRef = doc(db, "conversaciones", currentConversationId);
        await updateDoc(convRef, {
            ultimoMensaje: text,
            ultimoRemitente: currentUser.alias,
            visto: false,
            timestamp: serverTimestamp()
        });

    } catch (e) {
        console.error("Error enviando mensaje", e);
        alert("Error enviando mensaje");
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

// Auto-resize y lógica Enter/Shift+Enter
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        messageInput.style.height = 'auto'; // Reset altura al enviar
    }
});
searchInput.addEventListener('input', loadConversations);

// Navegación al perfil al hacer clic en el cabezal (foto o nombre)
const chatHeaderTitleArea = document.querySelector('.chat-header > div:first-child');
if (chatHeaderTitleArea) {
    chatHeaderTitleArea.style.cursor = 'pointer';
    chatHeaderTitleArea.title = 'Ver perfil';
    chatHeaderTitleArea.classList.add('header-interactive'); // For CSS effects
    
    chatHeaderTitleArea.addEventListener('click', (e) => {
        // No navegar si se hizo clic en el botón de volver (aunque el botón tiene su propio listener)
        if (e.target.closest('#chat-back-btn')) return;
        
        if (currentChatUserAlias) {
            window.location.href = `user-profile.html?id=${currentChatUserAlias}`;
        }
    });

    // Efecto visual al pasar el mouse
    chatHeaderTitleArea.addEventListener('mouseenter', () => {
        chatHeaderTitleArea.style.filter = 'brightness(1.2)';
    });
    chatHeaderTitleArea.addEventListener('mouseleave', () => {
        chatHeaderTitleArea.style.filter = 'none';
    });
}

// Mobile: Botón de volver a la lista
if (chatBackBtn) {
    chatBackBtn.addEventListener('click', () => {
        if (chatContainer) chatContainer.classList.remove('chat-open');
    });
}

// Alias Modal Logic
const changeAliasBtn = document.getElementById('change-alias-btn');
const aliasModal = document.getElementById('alias-modal');
const currentAliasDisplay = document.getElementById('current-alias-display');
const newAliasInput = document.getElementById('new-alias-input');
const saveAliasBtn = document.getElementById('save-alias');
const cancelAliasBtn = document.getElementById('cancel-alias');
const closeAliasBtn = document.getElementById('close-alias-modal');

if (changeAliasBtn) {
    changeAliasBtn.addEventListener('click', () => {
        const currentAlias = localStorage.getItem('alias') || currentUser?.alias || '';
        currentAliasDisplay.textContent = `Alias actual: ${currentAlias}`;
        newAliasInput.value = currentAlias;
        aliasModal.classList.add('active');
    });
}

function closeAliasModal() {
    aliasModal.classList.remove('active');
}

closeAliasBtn.onclick = closeAliasModal;
cancelAliasBtn.onclick = closeAliasModal;

saveAliasBtn.onclick = () => {
    const newAlias = newAliasInput.value.trim();
    if (newAlias !== '') {
        localStorage.setItem('alias', newAlias);
        aliasModal.classList.remove('active');
        window.location.reload();
    }
};

aliasModal.onclick = (e) => {
    if (e.target === aliasModal) closeAliasModal();
};

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
