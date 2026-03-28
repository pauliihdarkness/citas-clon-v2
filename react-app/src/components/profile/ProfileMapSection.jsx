import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../../../../assets/css/map-styles.css'
import { doc, getDoc } from 'firebase/firestore'
import { Radar } from 'lucide-react'
import { db } from '../../lib/firebase'
import { haversineKm, resolveCoords } from '../../lib/profileMapUtils'

export function ProfileMapSection({ viewedData, currentUserUid }) {
  const mapRef = useRef(null)
  const [distanceHtml, setDistanceHtml] = useState(null)

  const viewedResult = useMemo(
    () => (viewedData ? resolveCoords(viewedData) : null),
    [viewedData],
  )

  useEffect(() => {
    setDistanceHtml(null)
    if (!viewedData || !viewedResult || !mapRef.current) return undefined

    const viewedCoords = viewedResult.coords
    const zoomMap = { exact: 13, ciudad: 13, departamento: 10, provincia: 8, pais: 5 }
    const zoom = zoomMap[viewedResult.level] || 12

    const el = mapRef.current
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      preferCanvas: true,
    }).setView(viewedCoords, zoom)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      crossOrigin: true,
    }).addTo(map)

    L.circle(viewedCoords, {
      radius: zoom >= 13 ? 500 : zoom >= 10 ? 5000 : 30000,
      color: '#ffcc00',
      fillColor: '#ffcc00',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '3, 5',
    }).addTo(map)

    L.circleMarker(viewedCoords, {
      radius: 6,
      fillColor: '#ffcc00',
      color: '#fff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(map)

    let cancelled = false

    ;(async () => {
      if (!currentUserUid) return
      try {
        const myDocSnap = await getDoc(doc(db, 'users', currentUserUid))
        if (!myDocSnap.exists() || cancelled) return
        const myData = myDocSnap.data()
        const myResult = resolveCoords(myData)
        if (!myResult || cancelled) return

        const myCoords = myResult.coords
        const distKm = haversineKm(myCoords[0], myCoords[1], viewedCoords[0], viewedCoords[1])

        const myLocation = [myData.ciudad, myData.provincia].filter(Boolean).join(', ') || 'Tu ubicación'
        const viewedLocation = [viewedData.ciudad, viewedData.provincia].filter(Boolean).join(', ') || 'Su ubicación'

        let distValue
        let distUnit
        if (distKm < 1) {
          distValue = Math.round(distKm * 1000)
          distUnit = 'm'
        } else if (distKm < 100) {
          distValue = distKm.toFixed(1)
          distUnit = 'km'
        } else {
          distValue = Math.round(distKm)
          distUnit = 'km'
        }

        if (cancelled) return
        setDistanceHtml({
          myLocation,
          viewedLocation,
          viewedLabel: viewedData.alias || 'Usuario',
          distValue,
          distUnit,
        })

        L.polyline([myCoords, viewedCoords], {
          color: '#ffcc00',
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 10',
        }).addTo(map)

        L.circleMarker(myCoords, {
          radius: 6,
          fillColor: '#00ff00',
          color: '#fff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map)

        map.fitBounds(L.latLngBounds(myCoords, viewedCoords).pad(0.35))
      } catch (e) {
        console.warn('No se pudo calcular distancia:', e)
      }
    })()

    const inv = setTimeout(() => map.invalidateSize(), 200)

    return () => {
      cancelled = true
      clearTimeout(inv)
      map.remove()
    }
  }, [viewedData, viewedResult, currentUserUid])

  if (!viewedResult) return null

  return (
    <div
      id="profile-map-section"
      style={{
        marginTop: 20,
        background: 'rgba(5, 5, 5, 0.95)',
        border: '1px solid var(--border, #ffb000)',
        borderRadius: 8,
        padding: 12,
        position: 'relative',
        boxShadow: 'inset 0 0 20px rgba(255, 176, 0, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          padding: '4px 8px',
          background: 'rgba(255, 176, 0, 0.03)',
          borderBottom: '1px solid rgba(255, 176, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radar size={16} color="var(--accent, #ffcc00)" style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }} />
          <span
            style={{
              fontSize: '0.75em',
              fontWeight: 'bold',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--accent, #ffcc00)',
            }}
          >
            Ubicación aproximada
          </span>
        </div>
        <div style={{ fontSize: '0.6em', color: 'rgba(255,176,0,0.4)', fontFamily: 'monospace' }}>
          SAT-LINK: ACTIVE
        </div>
      </div>

      <div
        ref={mapRef}
        id="profile-map"
        style={{
          height: 240,
          borderRadius: 4,
          border: '1px solid rgba(255, 176, 0, 0.2)',
          filter: 'invert(100%) hue-rotate(180deg) brightness(0.7) contrast(1.2) sepia(60%) hue-rotate(320deg)',
        }}
      />

      {distanceHtml && (
        <div id="distance-info" style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              alignItems: 'center',
              gap: 8,
              padding: '16px 12px',
              background: 'linear-gradient(to bottom, rgba(13, 2, 8, 0.9), rgba(5, 5, 5, 0.95))',
              backgroundImage: 'repeating-linear-gradient(rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(255,176,0,0.02) 2px, rgba(255,176,0,0.02) 4px)',
              border: '1px solid rgba(255, 176, 0, 0.3)',
              borderRadius: 4,
              fontFamily: "'Share Tech Mono', monospace",
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Esquinas HUD */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: 4, borderTop: '1px solid #ffcc00', borderLeft: '1px solid #ffcc00' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 4, height: 4, borderTop: '1px solid #ffcc00', borderRight: '1px solid #ffcc00' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 4, height: 4, borderBottom: '1px solid #ffcc00', borderLeft: '1px solid #ffcc00' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 4, height: 4, borderBottom: '1px solid #ffcc00', borderRight: '1px solid #ffcc00' }} />

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.6em', color: '#00ff00', letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 0 5px #00ff00', marginBottom: 6 }}>
                ⬤ LOCAL
              </div>
              <div style={{ fontSize: '0.7em', color: '#a67200', lineHeight: 1.3, wordBreak: 'break-word', fontWeight: 'bold' }}>
                {distanceHtml.myLocation}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#ffcc00', textShadow: '0 0 10px #ffcc00', lineHeight: 1 }}>
                {distanceHtml.distValue}
              </div>
              <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#ffcc00', marginTop: 2 }}>
                {distanceHtml.distUnit}
              </div>
              <div style={{ height: 1, width: '40%', background: 'rgba(255, 176, 0, 0.3)', margin: '4px 0' }} />
              <div style={{ fontSize: '0.5em', letterSpacing: 1.5, color: 'rgba(255, 176, 0, 0.5)', textTransform: 'uppercase' }}>
                RANGE
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6em', color: '#ff9900', letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 0 5px #ff9900', marginBottom: 6 }}>
                {distanceHtml.viewedLabel} ⬤
              </div>
              <div style={{ fontSize: '0.7em', color: '#a67200', lineHeight: 1.3, wordBreak: 'break-word', fontWeight: 'bold' }}>
                {distanceHtml.viewedLocation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
