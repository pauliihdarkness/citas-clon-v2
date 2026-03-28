import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthSplash } from './AuthSplash'

export function LoginGate({ children }) {
  const { user, authReady, profileReady, hasProfile } = useAuth()

  if (!authReady || (user && !profileReady)) {
    return <AuthSplash />
  }

  if (user && hasProfile) {
    return <Navigate to="/" replace />
  }

  if (user && !hasProfile) {
    return <Navigate to="/create-profile" replace />
  }

  return children
}

export function CreateProfileGate() {
  const { user, authReady, profileReady } = useAuth()

  if (!authReady || (user && !profileReady)) {
    return <AuthSplash />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function RequireUserWithProfile() {
  const { user, authReady, profileReady, hasProfile } = useAuth()

  if (!authReady || (user && !profileReady)) {
    return <AuthSplash />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasProfile) {
    return <Navigate to="/create-profile" replace />
  }

  return <Outlet />
}
