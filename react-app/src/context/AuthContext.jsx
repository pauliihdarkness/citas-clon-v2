import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    let cancelled = false

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setAuthReady(true)

      if (!u) {
        setHasProfile(false)
        setProfile(null)
        setProfileReady(true)
        return
      }

      setProfileReady(false)
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (!cancelled) {
          const exists = snap.exists()
          setHasProfile(exists)
          setProfile(exists ? snap.data() : null)
        }
      } catch (e) {
        console.error('[AUTH] Error verificando perfil:', e)
        if (!cancelled) {
          setHasProfile(false)
          setProfile(null)
        }
      } finally {
        if (!cancelled) setProfileReady(true)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    await firebaseSignOut(auth)
    localStorage.removeItem('alias')
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const u = auth.currentUser
    if (!u) {
      setHasProfile(false)
      setProfile(null)
      return
    }
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      const exists = snap.exists()
      setHasProfile(exists)
      setProfile(exists ? snap.data() : null)
    } catch (e) {
      console.error('[AUTH] refreshProfile:', e)
      setHasProfile(false)
      setProfile(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      authReady,
      profileReady,
      hasProfile,
      signInWithGoogle,
      logout,
      refreshProfile,
    }),
    [user, profile, authReady, profileReady, hasProfile, signInWithGoogle, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
