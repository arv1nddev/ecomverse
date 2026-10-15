/**
 * CartPage – /cart
 *
 * Shows:
 *  - A banner when inactive products were removed from the cart.
 *  - Each cart line: image, name, variant, quantity stepper (1–10), remove button, line total.
 *  - Order summary: subtotal, shipping (free ≥ threshold, else fee), total.
 *  - "Add Rs X more for free shipping" hint when below the threshold.
 *  - "Proceed to checkout" button → /checkout (RequireAuth handles login).
 *  - Empty-cart state with a link to the shop.
 *
 * Rules:
 *  - No prices stored in context – all from Supabase via CartContext hydration.
 *  - Shipping threshold and fee come from store_settings via CartContext.
 *  - Quantity capped at 10 per line (CartContext enforces it too).
 */

import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatINR } from '../lib/money'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import type { CartLine } from '../context/CartContext'

// ── CartLineRow ────────────────────────────────────────────────────────────────

function CartLineRow({ line }: { line: CartLine }) {
  const { updateQuantity, removeItem } = useCart()

  const lineTotal = line.price * line.quantity

  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      {/* Product image */}
      <Link
        to={`/product/${line.slug}`}
        className="shrink-0 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100"
        tabIndex={-1}
        aria-label={`View ${line.name}`}
      >
        {line.imagePath ? (
          <img
            src={line.imagePath}
            alt={line.name}
            className="h-24 w-24 object-cover sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </Link>

      {/* Info + controls */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/product/${line.slug}`}
              className="block truncate text-sm font-semibold text-neutral-900 hover:text-brand-600 transition-colors"
            >
              {line.name}
            </Link>
            {line.variant && (
              <p className="mt-0.5 text-xs text-neutral-500">{line.variant}</p>
            )}
          </div>
          {/* Unit price */}
          <p className="shrink-0 text-sm font-medium text-neutral-700">
            {formatINR(line.price)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Quantity stepper */}
          <div
            className="flex items-center rounded-lg border border-neutral-300 bg-white overflow-hidden"
            role="group"
            aria-label={`Quantity for ${line.name}`}
          >
            <button
              type="button"
              onClick={() =>
                updateQuantity(line.product_id, line.variant, line.quantity - 1)
              }
              disabled={line.quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span
              className="w-7 text-center text-sm font-medium text-neutral-800 select-none"
              aria-label={`Quantity: ${line.quantity}`}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateQuantity(line.product_id, line.variant, line.quantity + 1)
              }
              disabled={line.quantity >= 10}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Line total */}
            <p className="text-sm font-semibold text-neutral-900">
              {formatINR(lineTotal)}
            </p>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeItem(line.product_id, line.variant)}
              aria-label={`Remove ${line.name}${line.variant ? ` (${line.variant})` : ''} from cart`}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-error hover:bg-red-50 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

// ── CartPage ───────────────────────────────────────────────────────────────────

export function CartPage() {
  const { lines, hydrating, settings, removedNames, clearRemovedNames } = useCart()
  const navigate = useNavigate()

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const isFreeShipping = subtotal >= settings.freeShippingThreshold
  const shippingFee = isFreeShipping ? 0 : settings.shippingFee
  const total = subtotal + shippingFee

  // How much more is needed for free shipping
  const amountUntilFree = settings.freeShippingThreshold - subtotal

  return (
    <>
      <title>Cart – Ecomverse</title>
      <meta name="description" content="Review your cart and proceed to checkout." />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Your cart</h1>

        {/* Removed-products banner */}
        {removedNames.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
          >
            <div className="flex items-start gap-2 text-sm text-neutral-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mt-0.5 shrink-0 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z"
                />
              </svg>
              <span>
                {removedNames.length === 1
                  ? 'One item was removed from your cart because it is no longer available.'
                  : `${removedNames.length} items were removed from your cart because they are no longer available.`}
              </span>
            </div>
            <button
              type="button"
              onClick={clearRemovedNames}
              aria-label="Dismiss notification"
              className="shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading */}
        {hydrating && lines.length === 0 && (
          <div className="mt-12">
            <Spinner label="Loading your cart…" />
          </div>
        )}

        {/* Empty state */}
        {!hydrating && lines.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-800">Your cart is empty</p>
              <p className="mt-1 text-sm text-neutral-500">
                Browse our products and add something you like!
              </p>
            </div>
            <Link
              to="/shop"
              id="empty-cart-shop-link"
              className="mt-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Browse products
            </Link>
          </div>
        )}

        {/* Cart contents */}
        {lines.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            {/* Item list */}
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
              <ul
                role="list"
                aria-label="Cart items"
                className="divide-y divide-neutral-100"
              >
                {lines.map((line) => (
                  <CartLineRow
                    key={`${line.product_id}::${line.variant ?? ''}`}
                    line={line}
                  />
                ))}
              </ul>

              {/* Continue shopping */}
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <Link
                  to="/shop"
                  id="continue-shopping-link"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Continue shopping
                </Link>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-base font-semibold text-neutral-900">Order summary</h2>

              <dl className="mt-4 flex flex-col gap-3 text-sm">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <dt className="text-neutral-600">Subtotal</dt>
                  <dd className="font-medium text-neutral-900">{formatINR(subtotal)}</dd>
                </div>

                {/* Shipping */}
                <div className="flex justify-between">
                  <dt className="text-neutral-600">Shipping</dt>
                  <dd className={`font-medium ${isFreeShipping ? 'text-success' : 'text-neutral-900'}`}>
                    {isFreeShipping ? 'Free' : formatINR(shippingFee)}
                  </dd>
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-100" />

                {/* Total */}
                <div className="flex justify-between">
                  <dt className="font-semibold text-neutral-900">Total</dt>
                  <dd className="text-lg font-bold text-neutral-900">{formatINR(total)}</dd>
                </div>
              </dl>

              {/* Free-shipping hint */}
              {!isFreeShipping && amountUntilFree > 0 && (
                <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3">
                  <p className="text-xs text-brand-700 font-medium">
                    🎁 Add{' '}
                    <span className="font-bold">{formatINR(amountUntilFree)}</span>{' '}
                    more to get free shipping!
                  </p>
                  {/* Progress bar */}
                  <div
                    className="mt-2 h-1.5 w-full rounded-full bg-brand-200 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={subtotal}
                    aria-valuemin={0}
                    aria-valuemax={settings.freeShippingThreshold}
                    aria-label="Free shipping progress"
                  >
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Checkout button */}
              <Button
                id="checkout-btn"
                size="lg"
                className="mt-5 w-full"
                onClick={() => navigate('/checkout')}
                aria-label="Proceed to checkout"
              >
                Proceed to checkout
              </Button>

              {/* Hint about login */}
              <p className="mt-3 text-center text-xs text-neutral-400">
                You'll be asked to sign in if you haven't already.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
