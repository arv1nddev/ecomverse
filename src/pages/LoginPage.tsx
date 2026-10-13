/**
 * LoginPage – Google sign-in only.
 * After a successful OAuth redirect, consumeReturnPath() in AuthContext
 * navigates the user back to where they came from.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { consumeReturnPath, useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

// Inline Google "G" logo SVG so we don't need an external asset
function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.14 0 5.95 1.08 8.16 2.85l6.09-6.09C34.46 3.14 29.57 1 24 1 14.82 1 7.01 6.48 3.53 14.24l7.08 5.5C12.31 13.65 17.69 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.68-.15-3.3-.43-4.86H24v9.2h12.64c-.55 2.92-2.22 5.4-4.74 7.07l7.27 5.65C43.58 37.36 46.5 31.34 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.61 28.26A14.4 14.4 0 0 1 9.5 24c0-1.49.26-2.93.71-4.26l-7.08-5.5A23.9 23.9 0 0 0 1 24c0 3.87.93 7.53 2.53 10.76l7.08-5.5z"
      />
      <path
        fill="#34A853"
        d="M24 47c5.57 0 10.24-1.84 13.66-5l-7.27-5.65c-1.84 1.24-4.2 1.97-6.39 1.97-6.31 0-11.69-4.15-13.39-9.74l-7.08 5.5C7.01 41.52 14.82 47 24 47z"
      />
    </svg>
  )
}

export function LoginPage() {
  const { session, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated (or just completed OAuth), redirect to return path
  useEffect(() => {
    if (!loading && session) {
      const returnPath = consumeReturnPath()
      navigate(returnPath, { replace: true })
    }
  }, [session, loading, navigate])

  async function handleGoogleSignIn() {
    setError(null)
    setSigningIn(true)
    try {
      // signInWithGoogle will store the current path and redirect to Google
      await signInWithGoogle()
    } catch {
      setError('Could not start Google sign-in. Please try again.')
      setSigningIn(false)
    }
  }

  return (
    <>
      <title>Sign in – Ecomverse</title>
      <meta name="description" content="Sign in with Google to place your order on Ecomverse." />

      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
              <p className="mt-2 text-sm text-neutral-500">
                Sign in to manage your orders and delivery address.
              </p>
            </div>

            {/* Google button */}
            <Button
              id="google-signin-btn"
              variant="secondary"
              size="lg"
              className="w-full gap-3 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              onClick={handleGoogleSignIn}
              loading={signingIn}
              disabled={signingIn || loading}
              aria-label="Continue with Google"
            >
              {!signingIn && <GoogleIcon />}
              Continue with Google
            </Button>

            {/* Error */}
            {error && (
              <p
                className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 text-center"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Divider note */}
            <p className="mt-6 text-center text-xs text-neutral-400">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline hover:text-neutral-600">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-neutral-600">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
