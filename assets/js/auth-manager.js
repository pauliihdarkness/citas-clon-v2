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

import { auth, onAuthStateChanged, signOut as firebaseSignOut } from './firebase-config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.initialized = false;
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
   * Cerrar sesión
   */
  async logout() {
    try {
      await firebaseSignOut(auth);
      console.log('[AUTH] ✓ Sesión cerrada');
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
