/**
 * Performance Optimizer — Optimizaciones de Velocidad Locales
 * Sin Service Workers | Sin cambios en BD
 * 
 * Estrategias incluidas:
 * 1. Lazy loading de imágenes
 * 2. Memoización en memoria
 * 3. Virtualización de listas (scroll virtual)
 * 4. Compresión de datos
 * 5. DOM query caching
 * 6. LocalStorage inteligente
 */

// ==========================================
// 1️⃣ LAZY LOADING DE IMÁGENES
// ==========================================

const lazyImageConfig = {
  threshold: 0.01,
  rootMargin: '50px'
};

let lazyImageObserver = null;

export function initLazyImages() {
  if ('IntersectionObserver' in window && !lazyImageObserver) {
    lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('lazy-loaded');
            lazyImageObserver.unobserve(img);
          }
        }
      });
    }, lazyImageConfig);
  }
}

export function observeLazyImage(element) {
  if (lazyImageObserver && element?.dataset?.src) {
    lazyImageObserver.observe(element);
  }
}

export function observeLazyImages(selector = 'img[data-src]') {
  if (!lazyImageObserver) initLazyImages();
  document.querySelectorAll(selector).forEach(img => {
    observeLazyImage(img);
  });
}

// ==========================================
// 2️⃣ MEMOIZACIÓN EN MEMORIA
// ==========================================

const memoCache = new Map();

export function memoize(func, key) {
  /**
   * Cachea resultados de function
   * Uso: memoize(expensiveSearch, `search-${term}`)
   */
  if (memoCache.has(key)) {
    return memoCache.get(key);
  }
  
  const result = func();
  memoCache.set(key, result);
  return result;
}

export function clearMemoCache(pattern = null) {
  if (pattern) {
    // Limpiar solo keys que coincidan con patrón
    for (let key of memoCache.keys()) {
      if (key.includes(pattern)) {
        memoCache.delete(key);
      }
    }
  } else {
    memoCache.clear();
  }
}

export function getMemoStats() {
  return {
    size: memoCache.size,
    keys: Array.from(memoCache.keys())
  };
}

// ==========================================
// 3️⃣ VIRTUALIZACIÓN DE LISTAS (Scroll Virtual)
// ==========================================

export class VirtualList {
  constructor(container, items, renderItem, config = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.items = items;
    this.renderItem = renderItem;
    
    this.itemHeight = config.itemHeight || 200;
    this.bufferSize = config.bufferSize || 5;
    this.scrollThrottle = config.scrollThrottle || 16; // ~60fps
    
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.lastScrollTime = 0;
    
    this.init();
  }
  
  init() {
    // Crear viewport y content
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-list-viewport';
    this.viewport.style.cssText = `
      height: 100%;
      overflow-y: auto;
      position: relative;
    `;
    
    this.content = document.createElement('div');
    this.content.className = 'virtual-list-content';
    this.content.style.cssText = `
      position: relative;
      height: ${this.items.length * this.itemHeight}px;
    `;
    
    this.viewport.appendChild(this.content);
    this.container.innerHTML = '';
    this.container.appendChild(this.viewport);
    
    // Setup scroll listener con throttle
    this.viewport.addEventListener('scroll', () => this.onScroll());
    this.render();
  }
  
  onScroll() {
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollThrottle) return;
    
    this.lastScrollTime = now;
    this.render();
  }
  
  render() {
    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight;
    
    // Calcular rango visible
    this.visibleStart = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    this.visibleEnd = Math.min(
      this.items.length,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize
    );
    
    // Limpiar content
    this.content.innerHTML = '';
    
    // Renderizar items visibles
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      const item = this.items[i];
      const element = document.createElement('div');
      element.style.cssText = `
        position: absolute;
        top: ${i * this.itemHeight}px;
        width: 100%;
        height: ${this.itemHeight}px;
      `;
      
      element.innerHTML = this.renderItem(item, i);
      this.content.appendChild(element);
    }
  }
  
  updateItems(newItems) {
    this.items = newItems;
    this.content.style.height = `${this.items.length * this.itemHeight}px`;
    this.render();
  }
}

// ==========================================
// 4️⃣ COMPRESIÓN DE DATOS EN MEMORIA
// ==========================================

export function compressUser(user) {
  /**
   * Reduce tamaño de objeto usuario
   * Guarda solo campos esenciales
   */
  return {
    id: user.id,
    a: user.alias,           // alias
    e: user.edad,            // edad
    c: user.ciudad,          // ciudad
    f: user.fotoPerfilUrl,   // foto
    m: user.membresia,       // membresia
    cr: user.creadoEn,       // creado
    ls: user.lastSeen,       // lastSeen
    io: user.isOnline        // isOnline
  };
}

export function decompressUser(compressed) {
  /**
   * Restaura objeto usuario desde comprimido
   */
  return {
    id: compressed.id,
    alias: compressed.a,
    edad: compressed.e,
    ciudad: compressed.c,
    fotoPerfilUrl: compressed.f,
    membresia: compressed.m,
    creadoEn: compressed.cr,
    lastSeen: compressed.ls,
    isOnline: compressed.io
  };
}

export function compressUsers(users) {
  return users.map(compressUser);
}

export function decompressUsers(compressed) {
  return compressed.map(decompressUser);
}

// ==========================================
// 5️⃣ DOM QUERY CACHING
// ==========================================

const domCache = new Map();

export function getCachedElement(selector) {
  if (!domCache.has(selector)) {
    domCache.set(selector, document.querySelector(selector));
  }
  return domCache.get(selector);
}

export function getCachedElements(selector) {
  if (!domCache.has(selector)) {
    domCache.set(selector, document.querySelectorAll(selector));
  }
  return domCache.get(selector);
}

export function invalidateDOMCache(selector = null) {
  if (selector) {
    domCache.delete(selector);
  } else {
    domCache.clear();
  }
}

export function getDOMCacheStats() {
  return {
    size: domCache.size,
    selectors: Array.from(domCache.keys())
  };
}

// ==========================================
// 6️⃣ LOCALSTORAGE INTELIGENTE
// ==========================================

const storageConfig = {
  prefix: 'miniapp_',
  ttl: {} // time-to-live en ms
};

export function setStorage(key, value, ttlMinutes = null) {
  const fullKey = storageConfig.prefix + key;
  const data = {
    value,
    timestamp: Date.now(),
    expires: ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : null
  };
  
  try {
    localStorage.setItem(fullKey, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('⚠️ localStorage lleno:', e.message);
    return false;
  }
}

export function getStorage(key, defaultValue = null) {
  const fullKey = storageConfig.prefix + key;
  
  try {
    const data = localStorage.getItem(fullKey);
    if (!data) return defaultValue;
    
    const parsed = JSON.parse(data);
    
    // Verificar TTL
    if (parsed.expires && Date.now() > parsed.expires) {
      localStorage.removeItem(fullKey);
      return defaultValue;
    }
    
    return parsed.value;
  } catch (e) {
    console.warn('⚠️ Error leyendo localStorage:', e.message);
    return defaultValue;
  }
}

export function clearStorage(pattern = null) {
  const keys = Object.keys(localStorage);
  
  if (pattern) {
    keys.forEach(key => {
      if (key.includes(storageConfig.prefix + pattern)) {
        localStorage.removeItem(key);
      }
    });
  } else {
    keys.forEach(key => {
      if (key.startsWith(storageConfig.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export function getStorageStats() {
  let size = 0;
  const items = [];
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(storageConfig.prefix)) {
      size += localStorage.getItem(key).length;
      items.push(key.replace(storageConfig.prefix, ''));
    }
  });
  
  return { size, items, percentage: (size / (1024 * 5)).toFixed(2) + '%' };
}

// ==========================================
// 7️⃣ DEBOUNCE MEJORADO CON TRAILING
// ==========================================

export function debounce(func, delay, options = {}) {
  let timeoutId;
  let lastCallTime = 0;
  let lastResult;
  
  return function (...args) {
    const now = Date.now();
    
    if (!lastCallTime) lastCallTime = now;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      lastResult = func.apply(this, args);
      lastCallTime = 0;
    }, delay);
    
    return lastResult;
  };
}

export function throttle(func, delay) {
  let lastCallTime = 0;
  let timeoutId;
  
  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
      func.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

// ==========================================
// 8️⃣ BATCH DOM UPDATES (reduce repaints)
// ==========================================

export function batchDOMUpdates(updates) {
  /**
   * Agrupa múltiples actualizaciones del DOM
   * Para evitar Layout thrashing
   * 
   * Uso: batchDOMUpdates([
   *   () => el1.style.width = '100px',
   *   () => el2.style.height = '50px'
   * ])
   */
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
      resolve();
    });
  });
}

// ==========================================
// 9️⃣ PERFORMANCE MONITORING
// ==========================================

const metrics = {
  pageStart: performance.now(),
  marks: new Map()
};

export function markTime(label) {
  metrics.marks.set(label, performance.now());
}

export function measureTime(label, startLabel) {
  const end = performance.now();
  const start = metrics.marks.get(startLabel) || metrics.pageStart;
  const duration = end - start;
  
  console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
  return duration;
}

export function getMetrics() {
  return {
    totalTime: performance.now() - metrics.pageStart,
    marks: Object.fromEntries(metrics.marks),
    memory: performance.memory ? {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
    } : 'No disponible'
  };
}

// ==========================================
// 🔟 INICIALIZACIÓN AUTOMÁTICA
// ==========================================

console.log('✅ Performance Optimizer cargado');
initLazyImages();
