/**
 * RequireAdmin – route guard for /admin/* pages.
 *
 * - While loading: show a spinner.
 * - If not authenticated or not admin: navigate to /admin (login page).
 * - Otherwise: render children.
 *
 * Real security is RLS. This guard is UX only (AGENTS.md Hard Rule 5).
 */

import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { Spinner } from '../ui/Spinner'
import type { ReactNode } from 'react'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking access…" />
      </div>
    )
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
