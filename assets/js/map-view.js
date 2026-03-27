import { db, collection, getDocs } from './firebase-config.js';
import { LOCATIONS_DATA } from './locations-data.js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const MAP_CENTER = [-34.6037, -58.3816]; // Buenos Aires
const MAP_ZOOM = 4;

// Coordenadas de provincias argentinas y países vecinos (centros oficiales)
const PROVINCE_COORDS = {
    // Estas se mantienen como fallback general si no hay match exacto en LOCATIONS_DATA
    "argentina":           [-38.4161, -63.6167],
    "buenos aires":        [-34.6186, -58.4420], // Caballito (Centro geográfico, lejos del río)
    "caba":                [-34.6186, -58.4420],
    "córdoba":             [-31.4201, -64.1888],
    "santa fe":            [-31.6107, -60.6973],
    "mendoza":             [-32.8895, -68.8458],
    "tucumán":             [-26.8083, -65.2176],
    "paraguay":            [-23.44, -58.44],
    "uruguay":             [-32.52, -55.76],
    "chile":               [-35.67, -71.54],
    "méxico":              [23.63, -102.55],
    "españa":              [40.46, -3.75],
};

// ============================================================================
// ESTADO
// ============================================================================
let map, markersLayer, searchMarker, locationCircle;
let allUsers = [];
let userMarkers = new Map(); // Registro de marcadores por user.id
let searchTimeout = null;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false })
        .setView(MAP_CENTER, MAP_ZOOM);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayer = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 40,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            return L.divIcon({
                html: `<div class="retro-cluster"><span>${count}</span></div>`,
                className: 'custom-cluster-marker',
                iconSize: L.point(40, 40)
            });
        }
    });
    map.addLayer(markersLayer);
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================
async function loadData() {
    updateStatus('SINCRONIZANDO CON FIRESTORE...');
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        processUsers();
        
        updateStatus(`LISTO — ${allUsers.filter(u => u._coords).length} usuaries localizades.`);
    } catch (err) {
        console.error('Error cargando datos:', err);
        updateStatus('ERROR DE CONEXIÓN.');
    }
}

// ============================================================================
// PROCESAMIENTO DE USUARIES (solo campos geonames: pais, provincia, ciudad, departamento, columna)
// ============================================================================
function processUsers() {
    for (const user of allUsers) {
        // Solo procesar usuaries con estructura moderna de geonames
        if (!user.pais && !user.provincia && !user.ciudad && !user.departamento && !user.columna) continue;

        // Construir la cadena de ubicación legible
        const locationParts = [user.ciudad, user.departamento || user.columna, user.provincia, user.pais]
            .filter(Boolean);
        user._locationStr = locationParts.join(', ').toUpperCase();

        // --- Resolución de coordenadas ---
        // 1. Si el usuario ya tiene coords guardadas en Firestore, usarlas
        if (user.coords && Array.isArray(user.coords) && user.coords.length === 2) {
            user._coords = user.coords;
            addMarker(user);
            continue;
        }

        // 2. Resolver coordenadas desde diccionario local (LOCATIONS_DATA)
        let coords = null;
        let matchLevel = 'ciudad'; 
        const searchParts = locationParts.map(p => p.toLowerCase().trim());
        const fullSearchStr = searchParts.join(', ');

        // Intentar match exacto con el string completo primero
        if (LOCATIONS_DATA[fullSearchStr] && (LOCATIONS_DATA[fullSearchStr][0] !== 0)) {
            coords = LOCATIONS_DATA[fullSearchStr];
            matchLevel = 'ciudad';
        } else {
            // Fallback: buscar cada parte individualmente en PROVINCE_COORDS o LOCATIONS_DATA
            for (let i = 0; i < searchParts.length && !coords; i++) {
                const part = searchParts[i];
                coords = (LOCATIONS_DATA[part] && LOCATIONS_DATA[part][0] !== 0) ? LOCATIONS_DATA[part] : PROVINCE_COORDS[part];
                
                if (coords) {
                    if (i === 0) matchLevel = 'ciudad';
                    else if (i === 1) matchLevel = 'departamento';
                    else if (i === 2) matchLevel = 'provincia';
                    else matchLevel = 'pais';
                }
            }
        }

        if (coords) {
            // Jitter según nivel de precisión
            let jitter;
            switch (matchLevel) {
                case 'ciudad':       jitter = 0.005; break; // ~500m
                case 'departamento': jitter = 0.04;  break; // ~4km
                case 'provincia':    jitter = 0.08;  break; // ~8km (antes 0.3, demasiado)
                default:             jitter = 0.4;   break; // ~40km (antes 1.5, demasiado)
            }

            // --- REFUERZO: Ajuste según región ---
            const nameSearchStr = searchParts.join(' ');
            if (nameSearchStr.includes('caba') || nameSearchStr.includes('buenos aires c.f.') || nameSearchStr.includes('capital')) {
                jitter = Math.min(jitter, 0.02); // Max ~2km en Capital Federal
            }

            user._coords = [
                coords[0] + (Math.random() - 0.5) * jitter,
                coords[1] + (Math.random() - 0.5) * jitter
            ];

            // --- REFUERZO: Evitar agua en Buenos Aires CABA / Costa ---
            // Si las coordenadas caen en el Río de la Plata (aprox E de -58.35)
            // las forzamos un poco más al oeste
            if (searchParts.some(p => p.includes('caba') || p.includes('buenos aires c.f.') || p.includes('capital'))) {
                if (user._coords[1] > -58.36) {
                    user._coords[1] -= Math.abs(user._coords[1] - (-58.37));
                }
            }

            addMarker(user);
        }
    }
}

// ============================================================================
// MARCADORES
// ============================================================================
function addMarker(user) {
    const isOnline = user.isOnline === true;
    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="modern-marker ${isOnline ? 'marker-online' : ''}"><div class="marker-dot"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const popup = `
        <div class="user-popup">
            <h3>${user.alias || 'Usuario'} ${user.membresia ? '<span class="badge-premium" style="font-size:10px; vertical-align:middle; margin-left:5px;">PREMIUM</span>' : ''}</h3>
            <p><span class="popup-label">LOCALIZACIÓN:</span> <span class="popup-value">${user._locationStr}</span></p>
            <p><span class="popup-label">EDAD / ORIENT:</span> <span class="popup-value">${user.edad || '??'} / ${user.orientacion || '??'}</span></p>
            ${user.busqueda ? `<p><span class="popup-label">BUSCANDO:</span> <span class="popup-value">${user.busqueda}</span></p>` : ''}
            <div class="popup-footer">
                <a href="user-profile.html?id=${user.id}" class="popup-link">ABRIR PERFIL</a>
            </div>
        </div>`;

    const marker = L.marker(user._coords, { icon }).bindPopup(popup);
    marker.on('click', () => map.panTo(user._coords));
    markersLayer.addLayer(marker);
    
    // Registrar marcador para acceso rápido desde búsqueda
    userMarkers.set(user.id, marker);
}

// ============================================================================
// BÚSQUEDA
// ============================================================================
function handleSearch(query) {
    const container = document.getElementById('search-results');
    if (!query || query.length < 2) {
        container.classList.add('hidden');
        return;
    }

    const term = query.toLowerCase();
    const results = allUsers
        .filter(u => u._coords && (
            (u.alias && u.alias.toLowerCase().includes(term)) ||
            (u.id && u.id.toLowerCase().includes(term))
        ))
        .slice(0, 8);

    if (results.length === 0) {
        container.innerHTML = '<div class="search-result-item">Sin resultados</div>';
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = results.map(u => `
        <div class="search-result-item" data-uid="${u.id}">
            <span class="search-result-name">${u.alias || 'Anónimo'}</span>
            <span class="search-result-loc">${u._locationStr || ''}</span>
        </div>
    `).join('');

    container.classList.remove('hidden');
    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const user = results.find(r => r.id === item.dataset.uid);
            if (!user) return;
            document.getElementById('map-search-input').value = user.alias || user.id;
            container.classList.add('hidden');
            flyToUser(user);
        });
    });
}

function flyToUser(user) {
    if (!user?._coords) {
        updateStatus(`SIN COORDENADAS: ${user?.alias || user?.id}`);
        return;
    }
    // searchMarker eliminado para simplificar UI
    updateStatus(`LOCALIZANDO: ${user.alias || user.id}`);

    // --- NUEVO: Círculo de sombra/zona sobre la localidad ---
    if (locationCircle) map.removeLayer(locationCircle);
    locationCircle = L.circle(user._coords, {
        radius: 800, // Zona de influencia visual
        color: '#ffcc00',
        fillColor: '#ffcc00',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '5, 10',
        className: 'location-zone-highlight'
    }).addTo(map);

    map.flyTo(user._coords, 15, { animate: true, duration: 2 });

    // Cuando termine de volar, o después de un momento, abrir el popup real del usuario
    setTimeout(() => {
        updateStatus('OBJETIVO LOCALIZADO.');
        
        // Obtener el marcador real de este usuario
        const marker = userMarkers.get(user.id);
        if (marker) {
            // zoomToShowLayer se asegura de que el cluster se abra si el punto está agrupado
            markersLayer.zoomToShowLayer(marker, () => {
                marker.openPopup();
            });
        }
    }, 2200);
}

// ============================================================================
// UTILIDADES
// ============================================================================
function updateStatus(text) {
    const el = document.getElementById('map-status');
    if (el) el.innerText = text;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();

    // Búsqueda
    const searchInput = document.getElementById('map-search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = document.querySelector('.search-result-item');
            if (first) first.click();
        }
    });

    // Botón limpiar búsqueda
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        document.getElementById('search-results').classList.add('hidden');
        if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
        if (locationCircle) { map.removeLayer(locationCircle); locationCircle = null; }
        updateStatus('LISTO.');
    });

    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            document.getElementById('search-results').classList.add('hidden');
        }
    });
});
