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
        return;
    } 
    
    if (isAuthenticated) {
        // Si estamos en login.html y ya tiene sesión, mandarlo al index (o perfil si no tiene)
        if (isLoginPage) {
            console.log('[AUTH-GUARD] ✅ Ya autenticado. Redirigiendo al inicio...');
            window.location.replace('./index.html');
            return;
        }

        // --- VERIFICACIÓN DE PERFIL ---
        // No verificar si ya estamos en create-profile.html para evitar bucles
        const isCreateProfilePage = window.location.pathname.includes('create-profile.html');
        
        if (!isCreateProfilePage) {
            const hasProfile = await authManager.checkProfile();
            
            if (!hasProfile) {
                console.warn('[AUTH-GUARD] 👤 Perfil no registrado. Redirigiendo a creación...');
                window.location.replace('./create-profile.html');
            }
        }
    }
})();
