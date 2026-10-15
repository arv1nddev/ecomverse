/**
 * AdminLoginPage – /admin
 *
 * Email + password sign-in for admins (supabase.auth.signInWithPassword).
 * After sign-in the AdminAuthContext loads the profile; if is_admin is false
 * it signs out and throws "You are not authorized." which we display here.
 *
 * Note: this page is rendered inside AdminLayout which wraps AdminAuthProvider.
 * Authenticated admins are redirected to /admin/orders.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function AdminLoginPage() {
  const { signIn, session, isAdmin, loading } = useAdminAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate('/admin/orders', { replace: true })
    }
  }, [loading, session, isAdmin, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/admin/orders', { replace: true })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Sign in failed. Check your credentials.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <title>Admin Sign in – Ecomverse</title>
      <meta name="description" content="Admin login for Ecomverse store management." />

      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-sm">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                Admin
              </p>
              <h1 className="mt-1 text-2xl font-bold text-neutral-900">Sign in</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Ecomverse store management
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <Input
                id="admin-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                placeholder="admin@example.com"
              />
              <Input
                id="admin-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                placeholder="••••••••"
              />

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
                >
                  {error}
                </div>
              )}

              <Button
                id="admin-signin-btn"
                type="submit"
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Sign in
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Customer store →{' '}
            <a href="/" className="underline hover:text-neutral-600">
              ecomverse.in
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
