// Captura pantalla del perfil usando html2canvas
// Dinámicamente carga html2canvas si no está presente
async function ensureHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function captureProfile() {
  const container = document.getElementById('profile-capture-area');
  if (!container) {
    alert('No se encontró el contenido para capturar.');
    return;
  }

  try {
    const html2canvas = await ensureHtml2Canvas();
    // scale 2 for better resolution
    const canvas = await html2canvas(container, { useCORS: true, scale: 2, logging: false });
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('No se pudo generar la imagen.');
        return;
      }
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(blob, `perfil_${ts}.png`);
    }, 'image/png');
  } catch (e) {
    console.error('Error capturando perfil:', e);
    alert('Error al capturar el perfil. Revisa la consola.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('screenshot-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = '⏳ Capturando...';
    setTimeout(async () => {
      await captureProfile();
      btn.disabled = false;
      btn.textContent = '📸 Capturar perfil';
    }, 800); // Mayor tiempo para que carguen los tiles del mapa
  });
});

export default {};
