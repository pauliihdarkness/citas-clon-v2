import { loadImageWithSkeleton } from '../skeleton-loader.js';

function getSafeImageUrl(url, alias) {
  const name = alias || '?';
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b1220&color=ffa500&size=400`;
  
  if (!url || typeof url !== 'string') return fallback;
  
  // if URL is malformed or relative (like the reported "ffffff?text=?")
  if (!url.startsWith('http') && !url.startsWith('data:')) {
    console.warn(`⚠️ URL de imagen malformada detectada: "${url}". Usando placeholder.`);
    return fallback;
  }
  
  return url;
}

export function createUserCard(user, onClick = null) {
  const { id, alias, edad, ciudad, provincia, fotoPerfilUrl } = user;
  const card = document.createElement('div');
  card.className = 'card-user';

  const locationParts = [ciudad, provincia].filter(Boolean);
  const locationText = locationParts.join(', ') || '';
  
  const imageUrl = getSafeImageUrl(fotoPerfilUrl, alias);

  if (user.membresia === true) {
    card.classList.add('premium');
    card.innerHTML = `
      <div class="folder-icon">
        <i data-lucide="crown"></i>
      </div>
      <div class="user-info">
        <h3 class="premium-text">${alias || 'Sin nombre'} ${edad ? ',' + edad : ''} <i data-lucide="crown" style="width:12px;height:12px;vertical-align:middle;"></i></h3>
        <p>${locationText}</p>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="folder-icon">
        <i data-lucide="folder"></i>
      </div>
      <div class="user-info">
        <h3>${alias || 'Sin nombre'} ${edad ? ',' + edad : ''}</h3>
        <p>${locationText}</p>
      </div>
    `;
  }

  card.addEventListener('click', () => {
    if (onClick) return onClick(user);
    window.location.href = `./user-profile.html?id=${id}`;
  });

  return card;
}

export function renderUserCards(users, container, onClick = null) {
  container.innerHTML = '';
  users.forEach(u => {
    const card = createUserCard(u, onClick);
    container.appendChild(card);
  });
}
