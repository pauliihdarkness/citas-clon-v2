/**
 * Auth Manager - Centraliza toda la lógica de autenticación
 * 
 * Uso:
 * import authManager from './auth-manager.js';
 * 
 * // Esperar a que se inicialice
 * await authManager.ready;
 * 
 * // Suscribirse a cambios
 * authManager.subscribe((user) => {
 *   if (!user) redirect('/login.html');
 * });
 * 
 * // Obtener usuario actual
 * const user = authManager.getUser();
 */

import { auth, db, doc, getDoc, onAuthStateChanged, signOut as firebaseSignOut } from './firebase-config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.initialized = false;
    this._hasProfileCache = null; // Cache para evitar múltiples lecturas por sesión
    this.ready = this.initializeAuth();
  }

  /**
   * Inicializa el listener de autenticación de Firebase
   */
  initializeAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        const userChanged = this.currentUser?.uid !== user?.uid;
        
        this.currentUser = user;
        
        if (userChanged) {
          console.log(`[AUTH] Usuario cambió:`, user ? user.email : 'No autenticado');
          this.notifyListeners();
        }

        if (!this.initialized) {
          this.initialized = true;
          console.log(`[AUTH] ✓ Autenticación inicializada`);
          resolve(user);
        }
      });
    });
  }

  /**
   * Suscribirse a cambios de autenticación
   * @param {Function} callback - Función que recibe (user) => void
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Si ya está inicializado, notificar inmediatamente
    if (this.initialized) {
      callback(this.currentUser);
    }
  }

  /**
   * Desuscribirse de cambios
   */
  unsubscribe(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notifica a todos los listeners del cambio de usuario
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (e) {
        console.error('[AUTH] Error en listener:', e);
      }
    });
  }

  /**
   * Obtener usuario actual
   */
  getUser() {
    return this.currentUser;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Obtener UID del usuario actual
   */
  getUserId() {
    return this.currentUser?.uid || null;
  }

  /**
   * Obtener email del usuario actual
   */
  getUserEmail() {
    return this.currentUser?.email || null;
  }

  /**
   * Verifica si el usuario actual tiene un perfil creado en Firestore
   * @returns {Promise<boolean>}
   */
  async checkProfile() {
    await this.ready;
    if (!this.currentUser) return false;

    // Si ya sabemos que tiene perfil, no leer Firestore de nuevo
    if (this._hasProfileCache === true) return true;

    try {
      console.log(`[AUTH] Verificando perfil para: ${this.currentUser.uid}`);
      const docRef = doc(db, 'users', this.currentUser.uid);
      const docSnap = await getDoc(docRef);

      const exists = docSnap.exists();
      this._hasProfileCache = exists;
      
      if (exists) {
        console.log('[AUTH] ✓ Perfil confirmado en Firestore');
      } else {
        console.warn('[AUTH] ⚠ El usuario no tiene perfil registrado');
      }

      return exists;
    } catch (e) {
      console.error('[AUTH] Error verificando perfil:', e);
      return false; // Por seguridad, asumimos que no tiene o que hubo error
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      await firebaseSignOut(auth);
      // Limpiar datos persistidos localmente
      localStorage.removeItem('alias');
      console.log('[AUTH] ✓ Sesión cerrada y localStorage limpiado');
    } catch (e) {
      console.error('[AUTH] Error cerrando sesión:', e);
      throw e;
    }
  }

  /**
   * Proteger una ruta - redirige a login si no está autenticado
   * @param {String} redirectUrl - URL a la que redirigir si no está autenticado
   */
  async requireAuth(redirectUrl = './login.html') {
    await this.ready;
    if (!this.isAuthenticated()) {
      window.location.replace(redirectUrl);
      return false;
    }
    return true;
  }

  /**
   * Debug: Ver estado actual
   */
  debug() {
    return {
      initialized: this.initialized,
      authenticated: this.isAuthenticated(),
      user: this.currentUser ? {
        uid: this.currentUser.uid,
        email: this.currentUser.email,
        displayName: this.currentUser.displayName,
        photoURL: this.currentUser.photoURL
      } : null,
      listeners: this.listeners.size
    };
  }
}

// Exportar singleton
export default new AuthManager();
