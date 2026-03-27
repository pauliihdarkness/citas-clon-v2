/**
 * IndexedDB Cache Manager
 * Permite cachear datos de Firestore con expiración automática
 * 
 * Uso:
 * const cache = new CacheManager();
 * await cache.set('miKey', datos, 60); // 60 minutos
 * const datos = await cache.get('miKey');
 */

export class CacheManager {
  constructor(dbName = 'miniapp-cache', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓ IndexedDB inicializado');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expiry', 'expiry', { unique: false });
          console.log('✓ Object store "cache" creado');
        }
      };
    });
  }

  async set(key, data, ttlMinutes = 60) {
    await this.ready;
    const expiry = Date.now() + ttlMinutes * 60000;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ 
        key, 
        data, 
        expiry, 
        timestamp: Date.now(),
        ttlMinutes 
      });

      request.onerror = () => {
        console.error(`❌ Error guardando caché ${key}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`💾 Caché guardado: ${key} (expira en ${ttlMinutes}min)`);
        resolve();
      };
    });
  }

  async get(key) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onerror = () => {
        console.error(`❌ Error leyendo caché ${key}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          console.log(`⊘ Caché no encontrado: ${key}`);
          return resolve(null);
        }

        // Verificar si caché expiró
        if (Date.now() > result.expiry) {
          console.log(`🗑️ Caché expirado: ${key}`);
          this.delete(key); // Limpiar caché vencido
          resolve(null);
        } else {
          const minutosRestantes = Math.round((result.expiry - Date.now()) / 60000);
          console.log(`📦 Caché encontrado: ${key} (${minutosRestantes}min restantes)`);
          resolve(result.data);
        }
      };
    });
  }

  async delete(key) {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`🗑️ Caché eliminado: ${key}`);
        resolve();
      };
    });
  }

  async clear() {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('🗑️ Todos los cachés eliminados');
        resolve();
      };
    });
  }

  async getAllKeys() {
    await this.ready;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getStats() {
    const keys = await this.getAllKeys();
    let totalSize = 0;
    const items = [];

    for (const key of keys) {
      const data = await this.get(key);
      const size = new Blob([JSON.stringify(data)]).size;
      totalSize += size;
      items.push({ key, size: `${(size / 1024).toFixed(2)}KB` });
    }

    return {
      totalItems: keys.length,
      totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
      items
    };
  }
}

export default CacheManager;
