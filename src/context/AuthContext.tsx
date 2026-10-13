/**
 * AuthContext
 * Provides: session, user, profile (from public.profiles), isAdmin, loading,
 *           signInWithGoogle(returnPath?), signOut.
 *
 * After Google OAuth redirect, the profile row may not exist immediately
 * (it is created by a DB trigger). We retry up to 5 times with brief delays.
 *
 * Return-path: stored in sessionStorage under RETURN_PATH_KEY so that the
 * OAuth redirect (which reloads the page) can pick it up.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

// ── Types ────────────────────────────────────────────────────────────────────

type Profile = Tables<'profiles'>

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signInWithGoogle: (returnPath?: string) => Promise<void>
  signOut: () => Promise<void>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RETURN_PATH_KEY = 'ecomverse_return_path'
const PROFILE_RETRY_ATTEMPTS = 5
const PROFILE_RETRY_DELAY_MS = 800

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // PGRST116 = no rows found – expected during the brief creation window
    if (error.code === 'PGRST116') return null
    console.error('[AuthContext] fetchProfile error', error)
    return null
  }
  return data
}

async function fetchProfileWithRetry(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    const profile = await fetchProfile(userId)
    if (profile) return profile
    if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, PROFILE_RETRY_DELAY_MS * (attempt + 1)),
      )
    }
  }
  return null
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      return
    }
    const p = await fetchProfileWithRetry(currentUser.id)
    setProfile(p)
  }, [])

  useEffect(() => {
    // 1. Get the initial session (handles OAuth redirect)
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      await loadProfile(s?.user ?? null)
      setLoading(false)
    })

    // 2. Listen for subsequent auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      await loadProfile(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signInWithGoogle = useCallback(async (returnPath?: string) => {
    // Persist the return path before the OAuth redirect reloads the page
    const path = returnPath ?? window.location.pathname + window.location.search
    if (path && path !== '/login') {
      sessionStorage.setItem(RETURN_PATH_KEY, path)
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }, [])

  const isAdmin = profile?.is_admin === true

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Read and clear the stored return path (call once after login). */
// eslint-disable-next-line react-refresh/only-export-components
export function consumeReturnPath(): string {
  const path = sessionStorage.getItem(RETURN_PATH_KEY) ?? '/'
  sessionStorage.removeItem(RETURN_PATH_KEY)
  return path
}
