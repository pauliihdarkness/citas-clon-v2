import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Layout } from './components/Layout'
import { PageTransition } from './components/PageTransition'
import { BootSequence } from './components/BootSequence'
import { db } from './lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import {
  CreateProfileGate,
  LoginGate,
  RequireUserWithProfile,
} from './components/RouteGuards'
import { CreateProfilePage } from './pages/CreateProfilePage'
import { FeedPage } from './pages/FeedPage'
import { MapPage } from './pages/MapPage'
import { LoginPage } from './pages/LoginPage'
import { InboxPage } from './pages/InboxPage'
import { MyProfilePage } from './pages/MyProfilePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserPublicPage } from './pages/UserPublicPage'
import { RadarPage } from './pages/RadarPage'

export default function App() {
  const location = useLocation()
  const [isBooted, setIsBooted] = useState(() => {
    return sessionStorage.getItem('app-booted') === 'true'
  })

  function handleBootComplete() {
    sessionStorage.setItem('app-booted', 'true')
    setIsBooted(true)
  }

  const { user: currentUser, profile } = useAuth()

  // Actualizar 'lastSeen' cada 5 minutos (300,000 ms)
  useEffect(() => {
    if (!currentUser) return undefined

    const updatePresence = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid)

        // Determinar si debemos mostrarnos online basado en los ajustes del perfil
        const canShowOnline = profile?.settings?.showOnline !== false

        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          // Actualizamos isOnline según el permiso
          isOnline: canShowOnline
        })
        console.log('[PRESENCE] lastSeen actualizada (Online:', canShowOnline, ')')
      } catch (e) {
        console.error('[PRESENCE] Error actualizando presencia:', e)
      }
    }

    // Actualizar inmediatamente al montar/loguear
    updatePresence()

    // Configurar intervalo de 5 minutos
    const interval = setInterval(updatePresence, 300000)

    return () => clearInterval(interval)
  }, [currentUser, profile])

  if (!isBooted) {
    return <BootSequence onComplete={handleBootComplete} />
  }

  return (
    <ToastProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <LoginGate>
                <PageTransition>
                  <LoginPage />
                </PageTransition>
              </LoginGate>
            }
          />

          <Route path="/create-profile" element={<CreateProfileGate />}>
            <Route element={<Layout />}>
              <Route index element={<PageTransition><CreateProfilePage /></PageTransition>} />
            </Route>
          </Route>

          <Route element={<RequireUserWithProfile />}>
            <Route element={<Layout />}>
              <Route index element={<FeedPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="explorer" element={<PlaceholderPage title="Explorer" />} />
              <Route path="storage" element={<PlaceholderPage title="Storage" />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="chat" element={<PlaceholderPage title="Chat global" />} />
              <Route path="activity" element={<RadarPage />} />
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="profile/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
              <Route path="user/:userId" element={<UserPublicPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </ToastProvider>
  )
}
