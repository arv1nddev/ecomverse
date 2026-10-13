/**
 * RequireAuth – route guard that redirects unauthenticated users to /login.
 * The current path is saved to sessionStorage so AuthContext can navigate
 * back after Google login.
 */

import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Store the intended destination so the login page can navigate back.
  useEffect(() => {
    if (!loading && !session) {
      const path = location.pathname + location.search
      if (path !== '/login') {
        sessionStorage.setItem('ecomverse_return_path', path)
      }
    }
  }, [loading, session, location])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
