/**
 * Visibility Manager - Gestiona listeners de Firestore según visibilidad
 * 
 * Ahorra recursos: desactiva listeners cuando la pestaña no está en foco
 * 
 * Uso:
 * import visibilityManager from './visibility-manager.js';
 * 
 * // Registrar un listener
 * visibilityManager.register(
 *   'chat-messages',
 *   () => {
 *     // Activar: Esto se ejecuta cuando la pestaña está visible
 *     return onSnapshot(collection(db, 'conversaciones'), snap => {
 *       // ... procesar datos
 *     });
 *   },
 *   () => {
 *     // Desactivar: Cleanup (si es necesario)
 *   }
 * );
 * 
 * // Activar cuando carga la página
 * visibilityManager.activate('chat-messages');
 */

export class VisibilityManager {
  constructor() {
    this.listeners = new Map();
    this.documentVisible = true;
    this.activeListeners = new Set();
    this.setupVisibilityListener();
    
    console.log('[VISIBILITY] ✓ Manager inicializado');
  }

  /**
   * Configura listeners de visibilidad
   */
  setupVisibilityListener() {
    // Cuando la pestaña pierde/recibe foco
    document.addEventListener('visibilitychange', () => {
      this.documentVisible = !document.hidden;
      console.log(`[VISIBILITY] Página: ${this.documentVisible ? '👀 Visible' : '😴 Oculta'}`);
      this.onVisibilityChange();
    });

    // Cuando vuelve a la pestaña
    window.addEventListener('pageshow', () => {
      this.documentVisible = true;
      console.log('[VISIBILITY] 👁️ Página mostrada (pageshow)');
      this.onVisibilityChange();
    });

    // Cuando sale de la pestaña
    window.addEventListener('pagehide', () => {
      this.documentVisible = false;
      console.log('[VISIBILITY] 👋 Página oculta (pagehide)');
      this.onVisibilityChange();
    });

    // Focus/Blur events como fallback
    window.addEventListener('focus', () => {
      if (!this.documentVisible) {
        this.documentVisible = true;
        console.log('[VISIBILITY] 👁️ Ventana en foco');
        this.onVisibilityChange();
      }
    });

    window.addEventListener('blur', () => {
      if (this.documentVisible) {
        this.documentVisible = false;
        console.log('[VISIBILITY] 👋 Ventana sin foco');
        this.onVisibilityChange();
      }
    });
  }

  /**
   * Registrar un nuevo listener
   * @param {string} id - ID único del listener
   * @param {Function} onActivate - Función que activa el listener (debe retornar unsubscribe fn)
   * @param {Function} onDeactivate - Función para cleanup (opcional)
   */
  register(id, onActivate, onDeactivate = null) {
    if (this.listeners.has(id)) {
      console.warn(`[VISIBILITY] ⚠️ Listener ${id} ya registrado`);
      return;
    }

    this.listeners.set(id, { 
      onActivate, 
      onDeactivate, 
      unsubscribe: null,
      registered: Date.now()
    });

    console.log(`[VISIBILITY] ✓ Listener ${id} registrado`);
  }

  /**
   * Activar un listener
   */
  activate(id) {
    const listener = this.listeners.get(id);
    
    if (!listener) {
      console.warn(`[VISIBILITY] ⚠️ Listener ${id} no existe`);
      return;
    }

    if (this.activeListeners.has(id)) {
      console.log(`[VISIBILITY] ℹ️ Listener ${id} ya está activo`);
      return;
    }

    try {
      listener.unsubscribe = listener.onActivate();
      this.activeListeners.add(id);
      console.log(`[VISIBILITY] ✓ Listener ${id} ACTIVADO`);
    } catch (e) {
      console.error(`[VISIBILITY] ❌ Error activando ${id}:`, e);
    }
  }

  /**
   * Desactivar un listener
   */
  deactivate(id) {
    const listener = this.listeners.get(id);
    
    if (!listener) {
      console.warn(`[VISIBILITY] ⚠️ Listener ${id} no existe`);
      return;
    }

    if (!this.activeListeners.has(id)) {
      console.log(`[VISIBILITY] ℹ️ Listener ${id} ya está inactivo`);
      return;
    }

    try {
      // Llamar unsubscribe si existe
      if (listener.unsubscribe && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }

      // Llamar callback de desactivación
      if (listener.onDeactivate && typeof listener.onDeactivate === 'function') {
        listener.onDeactivate();
      }

      listener.unsubscribe = null;
      this.activeListeners.delete(id);
      console.log(`[VISIBILITY] ✓ Listener ${id} DESACTIVADO`);
    } catch (e) {
      console.error(`[VISIBILITY] ❌ Error desactivando ${id}:`, e);
    }
  }

  /**
   * Callback cuando la visibilidad cambia
   */
  onVisibilityChange() {
    if (this.documentVisible) {
      // Reactivar listeners críticos
      console.log('[VISIBILITY] 📍 Reactivando listeners críticos...');
      this.listeners.forEach((listener, id) => {
        if (!this.activeListeners.has(id)) {
          // Criterio: reactivar todo excepto listeners que estén explícitamente inactivos
          if (!listener.persistentlyDisabled) {
            this.activate(id);
          }
        }
      });
    } else {
      // Desactivar todos los listeners cuando la pestaña se oculta
      console.log('[VISIBILITY] 📍 Desactivando listeners para ahorrar recursos...');
      const activeIds = Array.from(this.activeListeners);
      activeIds.forEach(id => {
        this.deactivate(id);
      });
    }
  }

  /**
   * Marcar listener como que NO debe reactivarse automáticamente
   */
  setPersistent(id, persistent = true) {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.persistentlyDisabled = !persistent;
      console.log(`[VISIBILITY] ${persistent ? '📌' : '📍'} Listener ${id} marcado como ${persistent ? 'persistente' : 'normal'}`);
    }
  }

  /**
   * Debug: Ver estado de listeners
   */
  debug() {
    const stats = {
      documentVisible: this.documentVisible,
      registeredListeners: this.listeners.size,
      activeListeners: this.activeListeners.size,
      details: []
    };

    this.listeners.forEach((listener, id) => {
      stats.details.push({
        id,
        active: this.activeListeners.has(id),
        unsubscribeExists: !!listener.unsubscribe,
        persistent: listener.persistentlyDisabled
      });
    });

    return stats;
  }

  /**
   * Desactivar todos los listeners
   */
  deactivateAll() {
    this.listeners.forEach((_, id) => {
      this.deactivate(id);
    });
  }

  /**
   * Activar todos los listeners
   */
  activateAll() {
    this.listeners.forEach((_, id) => {
      this.activate(id);
    });
  }
}

// Exportar singleton
export default new VisibilityManager();
