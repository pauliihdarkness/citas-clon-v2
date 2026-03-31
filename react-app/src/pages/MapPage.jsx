import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../assets/css/map-styles.css';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveCoords, haversineKm } from '../lib/profileMapUtils';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Radar, Search, User, MapPin, Navigation } from 'lucide-react';

export function MapPage() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const { profile, user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapStatus, setMapStatus] = useState('INITIALIZING...');

  const currentUserAlias = profile?.alias || localStorage.getItem('alias');

  // Load all users for the map
  useEffect(() => {
    document.body.classList.add('map-page');
    
    async function loadUsers() {
      setMapStatus('SCANNING_NETOWRK...');
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
        setMapStatus('SCAN_COMPLETE: ' + usersData.length + ' CONTACTS');
      } catch (err) {
        console.error('Error loading map users:', err);
        setMapStatus('SCAN_ERROR: OFFLINE');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();

    return () => {
      document.body.classList.remove('map-page');
    };
  }, []);

  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const markersRef = useRef({});
  const selectionCircleRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (loading || !mapRef.current) return;

    // Use current user's location as center or fallback to Argentina
    const myResult = profile ? resolveCoords(profile) : null;
    const center = myResult?.coords || [-38.4161, -63.6167];
    const zoom = myResult ? 12 : 11;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 18,
        minZoom: 3,
        preferCanvas: true,
      }).setView(center, zoom);

      // Sincronizar estado inicial
      setMapCenter(leafletMap.current.getCenter());

      // Listener para actualizaciones de coordenadas en HUD
      leafletMap.current.on('move', () => {
        setMapCenter(leafletMap.current.getCenter());
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; CartoDB',
      }).addTo(leafletMap.current);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

      // Force size update shortly after initialization to prevent gray screen
      setTimeout(() => {
        if (leafletMap.current) {
          leafletMap.current.invalidateSize();
          leafletMap.current.setView(center, zoom);
        }
      }, 500);
    }

    const map = leafletMap.current;
    
    // Invalidate size on each "loading" state change just in case
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Clear existing markers if any (for re-renders)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });
    markersRef.current = {};

    // Add markers for all users
    users.forEach(user => {
      const res = resolveCoords(user);
      if (!res) return;

      const isMe = user.alias === currentUserAlias;
      
      // Custom Marker Icon
      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="modern-marker ${user.isOnline ? 'marker-online' : (isMe ? 'marker-me' : '')}">
            <div class="marker-dot"></div>
            ${(isMe && !user.isOnline) ? '<div class="marker-pulse"></div>' : ''}
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(res.coords, { icon }).addTo(map);
      markersRef.current[user.id] = marker;

      // Distance calculation if applicable
      let distanceLabel = '';
      if (profile && !isMe) {
        const myCoords = resolveCoords(profile)?.coords;
        if (myCoords) {
          const dist = haversineKm(myCoords[0], myCoords[1], res.coords[0], res.coords[1]);
          distanceLabel = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
        }
      }

      // Popup Content (HUD Mini Card)
      const popupHtml = `
        <div class="user-popup-card">
          <div class="popup-header">
            <div class="popup-avatar-wrapper">
              <img src="${user.fotoPerfilUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.alias || 'U')}" class="popup-avatar" />
            </div>
            <div class="popup-title">
              <h3>${user.alias || 'ANONYMOUS'}</h3>
              <span class="popup-subtitle">${user.isOnline ? 'CONEXIÓN ACTIVA' : 'SISTEMA OFFLINE'}</span>
            </div>
          </div>
          <div class="popup-body">
            <div class="popup-info-row">
              <span class="popup-info-icon">📍</span>
              <span class="popup-info-text">${[user.ciudad, user.provincia].filter(Boolean).join(', ') || 'NÚCLEO DESCONOCIDO'}</span>
            </div>
            ${distanceLabel ? `
              <div class="popup-info-row">
                <span class="popup-info-icon">📡</span>
                <span class="popup-info-text">DISTANCIA: ${distanceLabel}</span>
              </div>
            ` : ''}
            ${user.biografia ? `<div class="popup-bio">${user.biografia}</div>` : ''}
          </div>
          <div class="popup-footer">
            <button class="btn-retro-popup" onclick="window.gotoUser('${user.id}')">VER EXPEDIENTE</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'hud-popup'
      });
    });

    // Handle clicks for "VER EXPEDIENTE" via window delegation (Leaflet popups are outside React tree)
    window.gotoUser = (id) => navigate(`/user/${id}`);

  }, [users, loading, profile, currentUserAlias, navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!leafletMap.current) return;
    
    setMapStatus('SEARCHING: ' + searchTerm.toUpperCase());
    
    // Basic search: zoom to the first user that matches alias
    const found = users.find(u => u.alias?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (found) {
      const res = resolveCoords(found);
      if (res && leafletMap.current) {
        const marker = markersRef.current[found.id];
        
        // Remove old circle
        if (selectionCircleRef.current) {
          leafletMap.current.removeLayer(selectionCircleRef.current);
        }

        leafletMap.current.setView(res.coords, 14);
        setMapStatus('LOCKED: ' + found.alias.toUpperCase());

        // Add scan circle around found user
        selectionCircleRef.current = L.circle(res.coords, {
          radius: 1000,
          color: '#ffcc00',
          fillColor: '#ffcc00',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 10'
        }).addTo(leafletMap.current);

        // Open marker popup automatically
        if (marker) {
          marker.openPopup();
        }
      }
    } else {
      setMapStatus('SEARCH_FAILED: NOT_FOUND');
    }
  };

  return (
    <div className="map-layout" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 50, background: '#000' }}>
      <div className="map-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div 
          ref={mapRef} 
          id="map" 
          style={{ 
            width: '100%', 
            height: '100%' 
          }}
        ></div>
        
        {/* Radar Overlays */}
        <div className="radar-grid-overlay"></div>
        <div 
          className="radar-scanline" 
          style={{ 
            animation: 'crt-flicker 0.15s infinite',
            background: 'repeating-linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.15) 2px, rgba(0, 0, 0, 0) 4px)',
            backgroundSize: '100% 4px',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.6
          }}
        ></div>
        
        {/* HUD Elements */}
        <div className="map-search-overlay">
          <form className="search-box" onSubmit={handleSearch}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="RASTREAR ALIAS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          <div className="map-status">{mapStatus}</div>
        </div>

        <div className="hud-corner top-left">
          <div className="hud-tag">MAP_CORE_V2.0</div>
          <div className="hud-value">REF: {Math.random().toString(36).substring(7).toUpperCase()}</div>
        </div>
        
        <div className="hud-corner bottom-left">
          <div className="hud-tag">SATELLITE_FEED</div>
          <div className="hud-value">LAT: {mapCenter.lat.toFixed(4)}</div>
          <div className="hud-value">LNG: {mapCenter.lng.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
