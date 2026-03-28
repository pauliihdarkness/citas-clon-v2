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
    
    // Mapeo inteligente de campos para esquema del proyecto
    // Para grandes ciudades como CABA:
    // city -> Ciudad
    // city_district -> Departamento (Comuna)
    // suburb/neighbourhood -> Columna (Barrio)
    
    return {
      display_name: item.display_name,
      // Priorizar el Barrio/Localidad específica como "Ciudad" para mayor precisión visual
      ciudad: addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || addr.locality || '',
      provincia: addr.state || '',
      pais: addr.country || '',
      // El Departamento/Comuna ahora se guarda consistentemente
      departamento: addr.city_district || addr.county || addr.state_district || addr.district || '',
      // Columna queda para detalles de zona menores
      columna: addr.quarter || addr.city_block || addr.municipality || '',
      coords: [parseFloat(item.lat), parseFloat(item.lon)],
      importance: item.importance || 0
    };
  }
};
