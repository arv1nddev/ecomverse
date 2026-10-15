/**
 * AdminAuthContext
 *
 * Manages the admin's auth session independently of the customer AuthContext.
 * Admins sign in with email + password (supabase.auth.signInWithPassword).
 * After sign-in we load the profile; if is_admin is false we sign out and
 * expose an "unauthorised" flag so the login page can show the right message.
 *
 * Note: real security is RLS. This context is UX only.
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminAuthContextValue {
  session: Session | null
  user: User | null
  isAdmin: boolean
  loading: boolean
  /** Sign in with email + password. Throws on auth failure. */
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────────

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────────

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  /** Load profile and return whether the user is admin. Signs out if not. */
  const checkAdmin = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setIsAdmin(false)
      return false
    }
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single()
    const admin = data?.is_admin === true
    if (!admin) {
      // Sign out immediately – they authenticated but are not authorised
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setIsAdmin(false)
      return false
    }
    setIsAdmin(true)
    return true
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      await checkAdmin(s?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await checkAdmin(s.user)
        } else {
          setIsAdmin(false)
        }
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [checkAdmin])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // checkAdmin will sign out and set isAdmin=false if not authorised;
    // it throws "not authorised" so the login page can catch it.
    const admin = await checkAdmin(data.user)
    if (!admin) {
      throw new Error('You are not authorized.')
    }
  }, [checkAdmin])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setIsAdmin(false)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ session, user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}
