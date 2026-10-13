import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { RequireAuth } from '../components/auth/RequireAuth'
import { AboutPage } from '../pages/AboutPage'
import { AccountPage } from '../pages/AccountPage'
import { CartPage } from '../pages/CartPage'
import { CheckoutPage } from '../pages/CheckoutPage'
import { ContactPage } from '../pages/ContactPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { MyOrdersPage } from '../pages/MyOrdersPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrderSuccessPage } from '../pages/OrderSuccessPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { ProductPage } from '../pages/ProductPage'
import { ReturnsPage } from '../pages/ReturnsPage'
import { ShippingPage } from '../pages/ShippingPage'
import { ShopPage } from '../pages/ShopPage'
import { TermsPage } from '../pages/TermsPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage'
import { AdminProductsPage } from '../pages/admin/AdminProductsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'shop/:slug', element: <ProductPage /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      {
        path: 'order-success',
        element: (
          <RequireAuth>
            <OrderSuccessPage />
          </RequireAuth>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        ),
      },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'shipping', element: <ShippingPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      // Admin routes — real protection is RLS; client-side guard added in Task 5
      { path: 'admin', element: <AdminLoginPage /> },
      { path: 'admin/orders', element: <AdminOrdersPage /> },
      { path: 'admin/products', element: <AdminProductsPage /> },
      { path: 'admin/categories', element: <AdminCategoriesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
