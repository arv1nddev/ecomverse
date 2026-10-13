/**
 * CartContext – STUB for Task 3.
 *
 * The real implementation (localStorage, quantity management, totals)
 * is done in Task 4 (Cart + Checkout). This file exists so that
 * ProductPage can call addToCart without crashing.
 *
 * The Header already reads localStorage directly for the badge count;
 * that remains unchanged until Task 4 replaces it.
 */

import { createContext, useContext, type ReactNode } from 'react'

export interface CartItem {
  productId: string
  productName: string
  slug: string
  price: number
  quantity: number
  variant: string | null
  imagePath: string | null
}

interface CartContextValue {
  /** Add or increment an item in the cart (stub: no-op in Task 3). */
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  /** Total number of units across all line items. */
  itemCount: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  // Task 3 stub – addToCart is a no-op; real logic added in Task 4.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function addToCart(_item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
    // TODO: implement in Task 4
  }

  // Read live count from localStorage so the Header badge still works.
  let itemCount = 0
  try {
    const raw = localStorage.getItem('ecomverse_cart')
    if (raw) {
      const items = JSON.parse(raw) as Array<{ qty?: number; quantity?: number }>
      itemCount = items.reduce((sum, i) => sum + Number(i.qty ?? i.quantity ?? 0), 0)
    }
  } catch {
    // ignore
  }

  return (
    <CartContext.Provider value={{ addToCart, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
