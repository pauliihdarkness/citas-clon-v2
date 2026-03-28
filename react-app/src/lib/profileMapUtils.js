import { LOCATIONS_DATA } from '../../../assets/js/locations-data.js'

const PROVINCE_COORDS = {
  'buenos aires c.f.': [-34.6186, -58.442],
  caba: [-34.6186, -58.442],
  'capital federal': [-34.6186, -58.442],
  'buenos aires': [-34.6186, -58.442],
  córdoba: [-31.4201, -64.1888],
  'santa fe': [-31.6107, -60.6973],
  mendoza: [-32.8895, -68.8458],
  tucumán: [-26.8083, -65.2176],
  'entre ríos': [-32.0589, -59.2014],
  misiones: [-26.8753, -54.4613],
  corrientes: [-28.7744, -58.4439],
  chaco: [-26.3868, -60.7653],
  formosa: [-24.8949, -59.9324],
  salta: [-24.7821, -65.4232],
  jujuy: [-23.32, -65.76],
  catamarca: [-27.33, -66.94],
  'la rioja': [-29.68, -67.18],
  'san juan': [-30.86, -68.88],
  'san luis': [-33.75, -66.03],
  'la pampa': [-37.13, -65.44],
  neuquén: [-38.57, -70.16],
  'río negro': [-40.73, -67.25],
  chubut: [-43.78, -68.52],
  'santa cruz': [-48.81, -69.95],
  'tierra del fuego': [-54.51, -67.48],
  argentina: [-38.4161, -63.6167],
  paraguay: [-23.4425, -58.4438],
  uruguay: [-32.5228, -55.7658],
  méxico: [23.6345, -102.5528],
  españa: [40.4637, -3.7492],
}

export function resolveCoords(data) {
  if (data.coords && Array.isArray(data.coords) && data.coords.length === 2) {
    return { coords: data.coords, level: 'exact' }
  }

  const parts = [data.ciudad, data.departamento || data.columna, data.provincia, data.pais]
    .filter(Boolean)
    .map((p) => p.toLowerCase().trim())

  if (parts.length === 0) return null

  const fullSearchStr = parts.join(', ')
  if (LOCATIONS_DATA[fullSearchStr] && LOCATIONS_DATA[fullSearchStr][0] !== 0) {
    return { coords: LOCATIONS_DATA[fullSearchStr], level: 'ciudad' }
  }

  const levels = ['ciudad', 'departamento', 'provincia', 'pais']
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const coords =
      LOCATIONS_DATA[part] && LOCATIONS_DATA[part][0] !== 0
        ? LOCATIONS_DATA[part]
        : PROVINCE_COORDS[part]
    if (coords) {
      return { coords, level: levels[i] || 'pais' }
    }
  }

  return null
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
