import { auth, provider, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-config.js";

const googleBtn = document.getElementById('google-login-btn');

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged manejará la redirección
    } catch (e) {
      console.error('Error login Google', e);
      alert('Error al iniciar con Google: ' + (e.message || e));
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    // redirigir al feed
    window.location.replace('./index.html');
  } else {
    // quedarse en login
  }
});

// Export logout para usar en otras páginas
export async function logout() {
  try {
    await signOut(auth);
    window.location.replace('./login.html');
  } catch (e) {
    console.error('Error logout', e);
  }
}
