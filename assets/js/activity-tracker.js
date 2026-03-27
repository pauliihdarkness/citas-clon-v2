/**
 * Activity Tracker — Rastrea actividad del usuario (LOCAL)
 * Se conecta automáticamente cuando se importa
 * 
 * NOTA: No actualiza Firestore (permisos insuficientes)
 * Funcionalidad local:
 * - Detecta actividad del usuario
 * - Mantiene estado en memoria
 */

import { auth, onAuthStateChanged } from './firebase-config.js';

let currentUser = null;
let isTracking = false;
let inactivityTimeout = null;
let isUserActive = false;
const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutos de inactividad

/**
 * Inicializa el rastreo de actividad (LOCAL)
 */
function initActivityTracker() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      console.log('✓ ActivityTracker iniciado para:', user.uid);
      isUserActive = true;

      // Solo si no estamos ya rastreando
      if (!isTracking) {
        setupActivityListeners();
        isTracking = true;
        console.log('✓ Listeners de actividad activados (LOCAL)');
      }
    } else {
      currentUser = null;
      isTracking = false;
      isUserActive = false;
      clearActivityListeners();
    }
  });
}

/**
 * Actualiza el estado local de actividad (NO escribe en Firestore)
 */
function updateUserActivity(isOnline = true) {
  if (!currentUser) return;

  isUserActive = isOnline;
  const status = isOnline ? '🟢 En línea' : '🔴 Inactivo';
  // Silencioso: no mostramos advertencias de permisos
}

/**
 * Configura listeners de actividad del usuario
 */
function setupActivityListeners() {
  // Movimiento del mouse
  document.addEventListener('mousemove', resetInactivityTimer);

  // Clics
  document.addEventListener('click', resetInactivityTimer);

  // Teclas
  document.addEventListener('keypress', resetInactivityTimer);

  // Scroll
  document.addEventListener('scroll', resetInactivityTimer, { passive: true });

  // Touch (para móviles)
  document.addEventListener('touchstart', resetInactivityTimer, { passive: true });
  document.addEventListener('touchend', resetInactivityTimer, { passive: true });

  // Cuando cierra la ventana
  window.addEventListener('beforeunload', markAsOffline);

  // Cuando el navegador pierde focus
  window.addEventListener('blur', markAsOfflineAfterDelay);

  // Cuando el navegador gana focus
  window.addEventListener('focus', async () => {
    if (currentUser) {
      console.log('📱 Página recuperó el foco');
      await updateUserActivity(true);
    }
  });

  // Cambio de visibilidad
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('📱 Página oculta');
      // No marcar de inmediato, esperar a que vuelva
    } else {
      console.log('📱 Página visible nuevamente');
      if (currentUser) {
        updateUserActivity(true);
      }
    }
  });

  // Inicia el temporizador de inactividad
  resetInactivityTimer();
}

/**
 * Limpia los listeners de actividad
 */
function clearActivityListeners() {
  document.removeEventListener('mousemove', resetInactivityTimer);
  document.removeEventListener('click', resetInactivityTimer);
  document.removeEventListener('keypress', resetInactivityTimer);
  document.removeEventListener('scroll', resetInactivityTimer);
  document.removeEventListener('touchstart', resetInactivityTimer);
  document.removeEventListener('touchend', resetInactivityTimer);

  window.removeEventListener('beforeunload', markAsOffline);
  window.removeEventListener('blur', markAsOfflineAfterDelay);

  clearTimeout(inactivityTimeout);
}

/**
 * Reinicia el temporizador de inactividad (LOCAL)
 */
function resetInactivityTimer() {
  clearTimeout(inactivityTimeout);

  // Después de 5 minutos de inactividad, marcar localmente como inactivo
  inactivityTimeout = setTimeout(() => {
    updateUserActivity(false);
  }, INACTIVITY_TIME);
}

/**
 * Marca al usuario como inactivo (LOCAL - sin Firestore)
 */
function markAsOffline() {
  if (!currentUser) return;
  isUserActive = false;
  // Sin escribir en Firestore
}

/**
 * Marca como inactivo después de un delay (LOCAL)
 */
function markAsOfflineAfterDelay() {
  if (currentUser) {
    // Esperar 1 segundo por si vuelve
    setTimeout(() => {
      if (document.hidden) {
        updateUserActivity(false);
      }
    }, 1000);
  }
}

// Iniciar rastreo automáticamente al importar este módulo
console.log('🔄 Activity Tracker cargado (modo LOCAL)');
initActivityTracker();

// Exportar funciones para uso manual si es necesario
export { updateUserActivity, initActivityTracker, isUserActive };
