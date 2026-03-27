import { db, auth, collection, query, where, onSnapshot, onAuthStateChanged } from './firebase-config.js';

class NotificationManager {
    constructor() {
        this.currentUserAlias = null;
        this.initialized = false;
        this.startTime = Date.now();
        this.container = null;
        this.activeListeners = new Map();
        
        this.setupAuth();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUserAlias = localStorage.getItem('alias');
                if (this.currentUserAlias) {
                    this.init();
                } else {
                    // No alias found
                }
            } else {
                this.cleanup();
            }
        });
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        this.createContainer();
        this.startListening();
    }

    createContainer() {
        this.container = document.getElementById('notification-container');
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    startListening() {
        const convRef = collection(db, 'conversaciones');
        const q = query(
            convRef, 
            where("participantes", "array-contains", this.currentUserAlias)
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data.visto && data.ultimoRemitente !== this.currentUserAlias) {
                    totalUnread++;
                }
            });
            this.updateGlobalBadge(totalUnread);

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const convId = change.doc.id;
                
                if (change.type === "modified" || change.type === "added") {
                    // Solo notificar si el último remitente NO es el usuario actual,
                    // el mensaje es reciente, y aún NO ha sido visto.
                    const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp?.seconds * 1000 || 0);
                    
                    // Margen de 10 segundos por posibles desfases de reloj
                    const isNew = timestamp > (this.startTime - 10000); 
                    const notMe = data.ultimoRemitente !== this.currentUserAlias;
                    
                    if (notMe && isNew && data.ultimoMensaje && !data.visto) {
                        this.showNotification(data, convId);
                    }
                }
            });
        }, (error) => {
            console.error('[NOTIFICATIONS] ❌ Error en el listener de Firestore:', error);
            if (error.code === 'permission-denied') {
                console.warn('[NOTIFICATIONS] Permisos insuficientes. Revisa las reglas de Firestore.');
            }
        });
    }

    showNotification(data, convId) {
        // Verificar si estamos en la página de chat de esta conversación
        const urlParams = new URLSearchParams(window.location.search);
        let currentChatId = urlParams.get('id');
        const participants = data.participantes || [];
        const otherUser = participants.find(p => p !== this.currentUserAlias);

        if (window.location.pathname.includes('chat-personal.html')) {
            const titleEl = document.getElementById('chat-title');
            if (titleEl && titleEl.textContent && titleEl.textContent !== 'Selecciona un chat') {
                currentChatId = titleEl.textContent;
            }
        }

        // Si estamos en chat-personal.html y el chat abierto es el mismo, no mostrar notificación
        if (window.location.pathname.includes('chat-personal.html') && currentChatId === otherUser) {
            return;
        }

        const title = "NUEVO MENSAJE RECIBIDO";
        const sender = otherUser || "Desconocido";
        const messageSnippet = data.ultimoMensaje || "Has recibido un mensaje";

        this.createContainer();
        if (!this.container) {
            console.error('[NOTIFICATIONS] ❌ Error: Contenedor no encontrado y no se pudo crear');
            return;
        }

        const notification = document.createElement('div');
        notification.className = 'retro-notification';
        
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${title}</span>
                <button class="notification-close">×</button>
            </div>
            <div class="notification-body">
                <span class="notification-sender">${sender}:</span>
                <span class="notification-message">${this.escapeHtml(messageSnippet)}</span>
            </div>
        `;

        notification.onclick = (e) => {
            if (e.target.className === 'notification-close') {
                this.removeNotification(notification);
                return;
            }
            window.location.href = `chat-personal.html?id=${sender}`;
        };

        // Auto remove after 8 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 8000);

        this.container.appendChild(notification);
        // Reiniciar Lucide si es necesario
        // Reiniciar Lucide si es necesario (el botón × no lo usa pero por si acaso)
        if (window.lucide) lucide.createIcons();
    }

    // Método para probar la UI desde la consola: notificationManager.testNotification()
    testNotification() {
        this.showNotification({
            ultimoRemitente: 'SISTEMA',
            ultimoMensaje: 'Este es un mensaje de prueba para verificar la UI.',
            participantes: ['SISTEMA', this.currentUserAlias || 'Usuario']
        }, 'test-conv-id');
        
        // Probar badge global
        const currentBadge = document.querySelector('.nav-badge');
        const count = (!currentBadge || currentBadge.style.display === 'none') ? 5 : 0;
        this.updateGlobalBadge(count);
    }

    removeNotification(el) {
        el.classList.add('hiding');
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 300);
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.initialized = false;
    }

    updateGlobalBadge(count) {
        // Buscar el enlace de Inbox en el nav
        const inboxLinks = document.querySelectorAll('a[href*="chat-personal.html"]');
        inboxLinks.forEach(link => {
            let badge = link.querySelector('.nav-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    link.style.position = 'relative';
                    link.appendChild(badge);
                }
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'flex';
            } else if (badge) {
                badge.style.display = 'none';
            }
        });
    }

    escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Iniciar automáticamente
const notificationManager = new NotificationManager();
export default notificationManager;
