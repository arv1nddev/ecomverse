/**
 * Header – sticky top bar.
 * Auth state comes from AuthContext (Task 2).
 * Shows: logo, nav links, cart badge, and either:
 *   - "Sign in" button (unauthenticated)
 *   - User's name / initials with a dropdown: Account, My orders, Sign out
 */

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'


/** Return the first letter of the first word in a name or email. */
function initials(displayName: string | null | undefined, email: string | null | undefined): string {
  const name = displayName ?? email ?? '?'
  return name.charAt(0).toUpperCase()
}

export function Header() {
  const { user, profile, session, signOut } = useAuth()
  const { itemCount } = useCart()
  const isLoggedIn = !!session
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? null

  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Close user dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-brand-600' : 'text-neutral-600 hover:text-neutral-900'
    }`

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-neutral-700 hover:bg-neutral-100'
    }`

  async function handleSignOut() {
    setUserMenuOpen(false)
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
          aria-label="Ecomverse home"
        >
          <img
            src="/logo.svg"
            alt="Ecomverse"
            className="h-8 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const sibling = e.currentTarget.nextElementSibling as HTMLElement | null
              if (sibling) sibling.style.display = 'block'
            }}
          />
          <span
            className="hidden text-lg font-bold tracking-tight text-neutral-900"
            aria-hidden="true"
          >
            Ecomverse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          <NavLink to="/shop" className={navLinkClass}>
            Shop
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Cart */}
          <Link
            to="/cart"
            className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
            id="cart-icon-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <button
                id="user-menu-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-neutral-100 transition-colors text-sm font-medium text-neutral-700"
              >
                {/* Avatar circle */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
                  {initials(displayName, user?.email)}
                </span>
                <span className="max-w-[120px] truncate">{displayName ?? 'Account'}</span>
                {/* Chevron */}
                <svg
                  className={`h-4 w-4 text-neutral-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account options"
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                >
                  <Link
                    to="/account"
                    role="menuitem"
                    id="dropdown-account"
                    className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    to="/orders"
                    role="menuitem"
                    id="dropdown-orders"
                    className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    My orders
                  </Link>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    role="menuitem"
                    id="dropdown-signout"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="login-btn"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile: cart + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/cart"
            className="relative p-2 text-neutral-600 hover:text-neutral-900"
            aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          <button
            id="mobile-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-neutral-600 hover:text-neutral-900"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-neutral-200 bg-white px-4 pb-4 pt-2"
          id="mobile-menu"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <NavLink to="/shop" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
              Shop
            </NavLink>
            <NavLink to="/about" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
              About
            </NavLink>
            <NavLink to="/contact" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
              Contact
            </NavLink>

            <div className="mt-2 border-t border-neutral-100 pt-2">
              {isLoggedIn ? (
                <>
                  {displayName && (
                    <p className="px-3 py-1 text-xs font-medium text-neutral-400 uppercase tracking-wide">
                      {displayName}
                    </p>
                  )}
                  <NavLink
                    to="/account"
                    className={mobileLinkClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    Account
                  </NavLink>
                  <NavLink
                    to="/orders"
                    className={mobileLinkClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    My orders
                  </NavLink>
                  <button
                    id="mobile-signout-btn"
                    onClick={handleSignOut}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink
                  to="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
