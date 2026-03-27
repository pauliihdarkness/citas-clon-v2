/**
 * GEO-MANAGER SERVICE
 * Encargado de la búsqueda y normalización de ubicaciones usando Nominatim API (OpenStreetMap)
 */

export const geoManager = {
  // Configuración de la API (Nominatim no requiere Key para bajo volumen)
  API_URL: 'https://nominatim.openstreetmap.org/search',

  /**
   * 🔍 Buscar una ubicación por texto
   * @param {string} query - Texto a buscar (ej: "Posadas, Misiones")
   * @returns {Promise<Array>} Lista de resultados normalizados
   */
  async searchLocation(query) {
    if (!query || query.length < 3) return [];

    try {
      const response = await fetch(`${this.API_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=es`);
      const data = await response.json();

      return data.map(item => this.normalizeResult(item));
    } catch (error) {
      console.error('❌ Error en búsqueda geo:', error);
      return [];
    }
  },

  /**
   * 🛠️ Normalizar el resultado de Nominatim al esquema del proyecto
   */
  normalizeResult(item) {
    const addr = item.address || {};
    
    // Mapeo inteligente de campos
    return {
      display_name: item.display_name,
      ciudad: addr.city || addr.town || addr.village || addr.city_district || addr.locality || '',
      provincia: addr.state || '',
      pais: addr.country || '',
      departamento: addr.county || addr.state_district || addr.district || addr.municipality || '',
      columna: addr.suburb || addr.neighbourhood || addr.quarter || '',
      coords: [parseFloat(item.lat), parseFloat(item.lon)],
      importance: item.importance || 0
    };
  }
};
