/**
 * router.tsx – client-side routes.
 *
 * All page components are lazy-loaded (React.lazy + Suspense) so the initial
 * bundle is small. Each route chunk is fetched only when first visited.
 *
 * AppLayout wraps customer routes (header + footer).
 * AdminLayout wraps admin routes (sidebar + AdminAuthProvider).
 * RequireAuth / RequireAdmin are UX guards; real protection is Supabase RLS.
 */

/* eslint-disable react-refresh/only-export-components */

import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { RequireAuth } from '../components/auth/RequireAuth'
import { RequireAdmin } from '../components/auth/RequireAdmin'
import { Spinner } from '../components/ui/Spinner'

// ── Lazy customer pages ────────────────────────────────────────────────────────

const AboutPage        = lazy(() => import('../pages/AboutPage').then(m => ({ default: m.AboutPage })))
const AccountPage      = lazy(() => import('../pages/AccountPage').then(m => ({ default: m.AccountPage })))
const CartPage         = lazy(() => import('../pages/CartPage').then(m => ({ default: m.CartPage })))
const CheckoutPage     = lazy(() => import('../pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const ContactPage      = lazy(() => import('../pages/ContactPage').then(m => ({ default: m.ContactPage })))
const HomePage         = lazy(() => import('../pages/HomePage').then(m => ({ default: m.HomePage })))
const LoginPage        = lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })))
const MyOrdersPage     = lazy(() => import('../pages/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })))
const NotFoundPage     = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const OrderSuccessPage = lazy(() => import('../pages/OrderSuccessPage').then(m => ({ default: m.OrderSuccessPage })))
const PrivacyPage      = lazy(() => import('../pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const ProductPage      = lazy(() => import('../pages/ProductPage').then(m => ({ default: m.ProductPage })))
const ReturnsPage      = lazy(() => import('../pages/ReturnsPage').then(m => ({ default: m.ReturnsPage })))
const ShippingPage     = lazy(() => import('../pages/ShippingPage').then(m => ({ default: m.ShippingPage })))
const ShopPage         = lazy(() => import('../pages/ShopPage').then(m => ({ default: m.ShopPage })))
const TermsPage        = lazy(() => import('../pages/TermsPage').then(m => ({ default: m.TermsPage })))

// ── Lazy admin pages ───────────────────────────────────────────────────────────

const AdminLoginPage     = lazy(() => import('../pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })))
const AdminOrdersPage    = lazy(() => import('../pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })))
const AdminProductsPage  = lazy(() => import('../pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })))
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })))

// ── Suspense fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Customer-facing routes (public header + footer) ──────────────────────────
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,         element: <S><HomePage /></S> },
      { path: 'shop',        element: <S><ShopPage /></S> },
      { path: 'shop/:slug',  element: <S><ProductPage /></S> },
      { path: 'product/:slug', element: <S><ProductPage /></S> },
      { path: 'cart',        element: <S><CartPage /></S> },
      { path: 'login',       element: <S><LoginPage /></S> },
      {
        path: 'account',
        element: <RequireAuth><S><AccountPage /></S></RequireAuth>,
      },
      {
        path: 'checkout',
        element: <RequireAuth><S><CheckoutPage /></S></RequireAuth>,
      },
      {
        path: 'order-success/:orderNumber',
        element: <RequireAuth><S><OrderSuccessPage /></S></RequireAuth>,
      },
      {
        path: 'orders',
        element: <RequireAuth><S><MyOrdersPage /></S></RequireAuth>,
      },
      { path: 'about',    element: <S><AboutPage /></S> },
      { path: 'contact',  element: <S><ContactPage /></S> },
      { path: 'shipping', element: <S><ShippingPage /></S> },
      { path: 'returns',  element: <S><ReturnsPage /></S> },
      { path: 'privacy',  element: <S><PrivacyPage /></S> },
      { path: 'terms',    element: <S><TermsPage /></S> },
      { path: '*',        element: <S><NotFoundPage /></S> },
    ],
  },

  // ── Admin routes (own layout; AdminAuthProvider lives in AdminLayout) ─────────
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      // Login — no RequireAdmin; authenticated admins are redirected inside AdminLoginPage
      { index: true, element: <S><AdminLoginPage /></S> },

      // Protected admin pages
      {
        path: 'orders',
        element: <RequireAdmin><S><AdminOrdersPage /></S></RequireAdmin>,
      },
      {
        path: 'products',
        element: <RequireAdmin><S><AdminProductsPage /></S></RequireAdmin>,
      },
      {
        path: 'categories',
        element: <RequireAdmin><S><AdminCategoriesPage /></S></RequireAdmin>,
      },
    ],
  },
])
