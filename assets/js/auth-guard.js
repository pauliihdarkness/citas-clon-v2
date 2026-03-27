import authManager from './auth-manager.js';

/**
 * Auth Guard
 * Redirige al login si el usuario no está autenticado.
 * Se debe incluir en todas las páginas que requieran sesión.
 */
(async () => {
    // No redirigir si ya estamos en login.html
    const isLoginPage = window.location.pathname.includes('login.html');
    
    // Esperar a que Firebase inicialice el estado de auth
    await authManager.ready;
    
    const isAuthenticated = authManager.isAuthenticated();
    
    if (!isAuthenticated && !isLoginPage) {
        console.log('[AUTH-GUARD] 🔐 No autenticado. Redirigiendo a login...');
        window.location.replace('./login.html');
    } else if (isAuthenticated && isLoginPage) {
        console.log('[AUTH-GUARD] ✅ Ya autenticado. Redirigiendo al inicio...');
        window.location.replace('./index.html');
    }
})();
