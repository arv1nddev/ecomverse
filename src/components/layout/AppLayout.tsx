import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { CartProvider } from '../../context/CartContext'
import { Footer } from './Footer'
import { Header } from './Header'

export function AppLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <Header />
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </CartProvider>
    </AuthProvider>
  )
}
