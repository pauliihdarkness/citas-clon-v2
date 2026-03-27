/**
 * Skeleton Loader Manager — Manejo de loaders esqueléticos
 * Muestra placeholders mientras las imágenes cargan
 */

/**
 * Carga una imagen con skeleton loader
 * @param {HTMLImageElement} img - Elemento img
 * @param {String} src - URL de la imagen
 */
export function loadImageWithSkeleton(img, src) {
  if (!img) return;

  // Marcar como cargando
  img.classList.add('loading');
  if (img.parentElement) {
    img.parentElement.classList.add('loading');
  }

  const image = new Image();
  
  image.onload = () => {
    img.src = src;
    img.classList.remove('loading');
    img.classList.add('loaded');
    
    if (img.parentElement) {
      img.parentElement.classList.remove('loading');
      img.parentElement.classList.add('loaded');
    }
  };
  
  image.onerror = () => {
    // Si falla la carga, mostrar placeholder
    img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22400%22/%3E%3Ctext x=%22200%22 y=%22200%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2220%22 fill=%22%23999%22%3E⚠️ Error%3C/text%3E%3C/svg%3E';
    img.classList.remove('loading');
    img.classList.add('loaded');
    
    if (img.parentElement) {
      img.parentElement.classList.remove('loading');
      img.parentElement.classList.add('error');
    }
  };

  // Iniciar carga
  image.src = src;
}

/**
 * Crea un skeleton loader para una tarjeta de usuario
 * @returns {HTMLElement} - Elemento skeleton
 */
export function createCardSkeleton() {
  const card = document.createElement('div');
  card.className = 'card-skeleton';
  
  card.innerHTML = `
    <div class="skeleton-image"></div>
    <div class="skeleton-content">
      <div class="skeleton-text full"></div>
      <div class="skeleton-text short"></div>
    </div>
  `;
  
  return card;
}

/**
 * Crea múltiples skeletons para placeholder de carga
 * @param {Number} count - Número de skeletons a crear
 * @returns {HTMLElement[]} - Array de elementos skeleton
 */
export function createCardSkeletons(count = 6) {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(createCardSkeleton());
  }
  return skeletons;
}

/**
 * Reemplaza skeletons con tarjetas reales
 * @param {HTMLElement} container - Contenedor padre
 * @param {HTMLElement[]} cards - Tarjetas reales a mostrar
 */
export function replaceSkeletons(container, cards) {
  if (!container) return;

  // Encontrar todos los skeletons
  const skeletons = container.querySelectorAll('.card-skeleton');
  
  // Reemplazar cada skeleton con una tarjeta real
  let cardIndex = 0;
  skeletons.forEach((skeleton) => {
    if (cardIndex < cards.length) {
      skeleton.replaceWith(cards[cardIndex]);
      cardIndex++;
    } else {
      skeleton.remove();
    }
  });

  // Si hay más tarjetas que skeletons, agregar el resto
  while (cardIndex < cards.length) {
    container.appendChild(cards[cardIndex]);
    cardIndex++;
  }
}

/**
 * Mostrar skeletons mientras se cargan datos
 * @param {HTMLElement} container - Contenedor donde mostrarselos
 * @param {Number} count - Número de skeletons (ignorado ahora)
 */
export function showLoadingSkeletons(container, count = 6) {
  if (!container) return;

  container.innerHTML = '<p class="loading-message">Cargando perfiles...</p>';
}

/**
 * Obtener estado de carga de imagen
 * @param {HTMLImageElement} img - Elemento imagen
 * @returns {String} - 'loading', 'loaded', 'error', o 'unknown'
 */
export function getImageLoadState(img) {
  if (!img) return 'unknown';

  if (img.classList.contains('loading')) return 'loading';
  if (img.classList.contains('error')) return 'error';
  if (img.classList.contains('loaded')) return 'loaded';

  return 'unknown';
}

/**
 * Observar imágenes y cargarlas con skeleton
 * @param {String} selector - Selector CSS para imágenes
 */
export function observeImagesWithSkeleton(selector = '.user-photo img[data-src]') {
  const images = document.querySelectorAll(selector);
  
  images.forEach(img => {
    const src = img.dataset.src;
    if (src) {
      loadImageWithSkeleton(img, src);
    }
  });
}
