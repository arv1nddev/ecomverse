/**
 * CheckoutPage – /checkout (RequireAuth)
 *
 * Shows:
 *  1. Delivery address block (from AuthContext profile).
 *     - If incomplete, blocks payment with a clear message and an "Update address" link.
 *  2. Order summary (items from CartContext, shipping, total).
 *  3. Pay button.
 *
 * Payment flow (AGENTS.md Gotchas):
 *  1. Disable the Pay button while processing – no double clicks.
 *  2. Call create-order with { items: [{ product_id, quantity, variant }] }.
 *     Show friendly error from error.context.json().error on failure.
 *  3. Load Razorpay Checkout.js dynamically.
 *  4. Open with key_id, amount, currency, order_id, prefill exactly as returned.
 *  5. handler: call verify-payment with the full Razorpay response, clear cart,
 *     navigate to /order-success/:orderNumber.
 *  6. Handle payment.failed and modal dismissal with a friendly message.
 *  7. If verify-payment fails AFTER a successful Razorpay payment: tell the customer
 *     "Payment received, we are confirming your order; check My orders shortly"
 *     and never ask them to pay again.
 *
 * Rules:
 *  - Browser sends ONLY product_id, quantity, variant to create-order.
 *    Prices and totals come from the server.
 *  - No Razorpay live keys, no secrets in the frontend.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { formatINR } from '../lib/money'
import { Button } from '../components/ui/Button'


// ── Types ──────────────────────────────────────────────────────────────────────

interface CreateOrderResponse {
  order_number: string
  razorpay_order_id: string
  amount: number      // paise
  currency: string
  key_id: string
  prefill: { name: string; email: string; contact: string }
}

// Global type shim for Razorpay Checkout (no npm package needed)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Dynamically load the Razorpay Checkout script (idempotent). */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return }
    const existingScript = document.getElementById('razorpay-checkout-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay')))
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout. Check your connection.'))
    document.body.appendChild(script)
  })
}

/** Extract a friendly error message from a Supabase Edge Function error. */
async function extractEdgeError(err: unknown): Promise<string> {
  try {
    if (
      err instanceof Object &&
      'context' in err &&
      err.context instanceof Object &&
      'json' in err.context &&
      typeof (err.context as { json: unknown }).json === 'function'
    ) {
      const body = await (err.context as { json: () => Promise<{ error?: string }> }).json()
      if (body?.error) return body.error
    }
  } catch {
    // ignore
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred. Please try again.'
}

/** Check if all required address fields are present. */
function isAddressComplete(profile: {
  full_name?: string | null
  phone?: string | null
  address_line?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
} | null): boolean {
  if (!profile) return false
  return !!(
    profile.full_name &&
    profile.phone &&
    profile.address_line &&
    profile.city &&
    profile.state &&
    profile.pincode
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { profile, user } = useAuth()
  const { lines, settings, clearCart } = useCart()
  const navigate = useNavigate()

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  // "post-payment-verify-failure" special state
  const [verifyFailedAfterPayment, setVerifyFailedAfterPayment] = useState(false)

  // Ref to track if the Razorpay modal was dismissed without paying
  const rzpRef = useRef<{ close: () => void } | null>(null)

  // Recompute totals from cart lines (display only – server is authoritative)
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const isFreeShipping = subtotal >= settings.freeShippingThreshold
  const shippingFee = isFreeShipping ? 0 : settings.shippingFee
  const total = subtotal + shippingFee

  const addressOk = isAddressComplete(profile)

  // Clear any Razorpay script on unmount to avoid interference in dev mode
  useEffect(() => {
    return () => {
      rzpRef.current = null
    }
  }, [])

  async function handlePay() {
    if (!addressOk || lines.length === 0 || paying) return
    setPayError(null)
    setPaying(true)

    // 1. Load Razorpay Checkout.js
    try {
      await loadRazorpayScript()
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not load payment module.')
      setPaying(false)
      return
    }

    // 2. Call create-order
    const items = lines.map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
      variant: l.variant,
    }))

    let orderData: CreateOrderResponse
    try {
      const { data, error } = await supabase.functions.invoke<CreateOrderResponse>(
        'create-order',
        { body: { items } },
      )
      if (error) {
        const msg = await extractEdgeError(error)
        setPayError(msg)
        setPaying(false)
        return
      }
      if (!data) {
        setPayError('Could not create order. Please try again.')
        setPaying(false)
        return
      }
      orderData = data
    } catch (err) {
      const msg = await extractEdgeError(err)
      setPayError(msg)
      setPaying(false)
      return
    }

    // 3. Open Razorpay Checkout
    const rzpOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.razorpay_order_id,
      prefill: orderData.prefill,
      name: 'Ecomverse',
      description: `Order ${orderData.order_number}`,
      theme: { color: '#14b8a6' },

      // 4. Success handler: call verify-payment
      handler: async (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => {
        try {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke<{
            order_number: string
          }>('verify-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          })

          if (verifyError) {
            // verify-payment failed AFTER a successful Razorpay payment.
            // Per AGENTS.md: do NOT ask to pay again; the webhook will mark it paid.
            setVerifyFailedAfterPayment(true)
            setPaying(false)
            return
          }

          // Clear cart and navigate to success page
          clearCart()
          navigate(`/order-success/${verifyData?.order_number ?? orderData.order_number}`)
        } catch {
          setVerifyFailedAfterPayment(true)
          setPaying(false)
        }
      },

      // 5. Payment failed handler
      'modal.ondismiss': () => {
        // User closed the modal without paying
        if (!verifyFailedAfterPayment) {
          setPayError('Payment was cancelled. Your order has not been placed.')
          setPaying(false)
        }
      },
    }

    const rzp = new window.Razorpay(rzpOptions)
    rzpRef.current = rzp

    rzp.on('payment.failed', (response: { error: { description?: string; reason?: string } }) => {
      const msg =
        response.error?.description ??
        response.error?.reason ??
        'Payment failed. Please try again.'
      setPayError(msg)
      setPaying(false)
    })

    rzp.open()
  }

  return (
    <>
      <title>Checkout – Ecomverse</title>
      <meta name="description" content="Review your order and pay securely." />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Checkout</h1>

        {/* Verify-failed-after-payment banner */}
        {verifyFailedAfterPayment && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4"
          >
            <p className="font-semibold text-brand-800">
              Payment received — confirming your order
            </p>
            <p className="mt-1 text-sm text-brand-700">
              Your payment was successful. We're confirming the order on our end — please check{' '}
              <Link to="/orders" className="underline font-medium">
                My orders
              </Link>{' '}
              in a few minutes. Do not pay again.
            </p>
          </div>
        )}

        {/* Empty cart guard */}
        {lines.length === 0 && !verifyFailedAfterPayment && (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-medium text-neutral-700">Your cart is empty.</p>
            <Link
              to="/shop"
              className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Browse products
            </Link>
          </div>
        )}

        {lines.length > 0 && !verifyFailedAfterPayment && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-6">

              {/* Delivery address */}
              <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">Delivery address</h2>
                  <Link
                    to="/account"
                    id="edit-address-link"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    {addressOk ? 'Edit' : 'Add address'}
                  </Link>
                </div>

                {addressOk && profile ? (
                  <address className="mt-3 not-italic text-sm text-neutral-700 leading-relaxed">
                    <p className="font-medium text-neutral-900">{profile.full_name}</p>
                    <p>{profile.address_line}</p>
                    <p>
                      {profile.city}, {profile.state} – {profile.pincode}
                    </p>
                    <p>Phone: {profile.phone}</p>
                    {user?.email && (
                      <p className="text-neutral-500 text-xs mt-1">{user.email}</p>
                    )}
                  </address>
                ) : (
                  <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
                    <p className="text-sm font-medium text-neutral-700">
                      Your delivery address is incomplete.
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Please{' '}
                      <Link
                        to="/account"
                        className="font-medium text-brand-600 underline hover:text-brand-700"
                      >
                        add your address
                      </Link>{' '}
                      before placing the order.
                    </p>
                  </div>
                )}
              </section>

              {/* Items list */}
              <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
                <h2 className="text-base font-semibold text-neutral-900">
                  Items ({lines.length})
                </h2>
                <ul role="list" className="mt-4 flex flex-col gap-4 divide-y divide-neutral-100">
                  {lines.map((line) => (
                    <li
                      key={`${line.product_id}::${line.variant ?? ''}`}
                      className="flex items-center gap-4 pt-4 first:pt-0"
                    >
                      {line.imagePath ? (
                        <img
                          src={line.imagePath}
                          alt={line.name}
                          className="h-14 w-14 rounded-lg object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-neutral-300"
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

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {line.name}
                        </p>
                        {line.variant && (
                          <p className="text-xs text-neutral-500">{line.variant}</p>
                        )}
                        <p className="text-xs text-neutral-500 mt-0.5">Qty: {line.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-neutral-900">
                        {formatINR(line.price * line.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* ── Right column: summary + pay ── */}
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-base font-semibold text-neutral-900">Order summary</h2>

              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-600">Subtotal</dt>
                  <dd className="font-medium text-neutral-900">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-600">Shipping</dt>
                  <dd className={`font-medium ${isFreeShipping ? 'text-success' : 'text-neutral-900'}`}>
                    {isFreeShipping ? 'Free' : formatINR(shippingFee)}
                  </dd>
                </div>
                <div className="border-t border-neutral-100" />
                <div className="flex justify-between">
                  <dt className="font-semibold text-neutral-900">Total</dt>
                  <dd className="text-lg font-bold text-neutral-900">{formatINR(total)}</dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
                Prices shown are estimates. The final amount charged will be confirmed by the
                server before payment.
              </p>

              {/* Error */}
              {payError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
                >
                  {payError}
                </div>
              )}

              {/* Pay button */}
              <Button
                id="pay-btn"
                size="lg"
                className="mt-5 w-full"
                disabled={!addressOk || lines.length === 0 || paying}
                loading={paying}
                onClick={handlePay}
                aria-label={
                  !addressOk
                    ? 'Add your delivery address first'
                    : paying
                      ? 'Processing payment…'
                      : `Pay ${formatINR(total)}`
                }
              >
                {paying ? 'Processing…' : `Pay ${formatINR(total)}`}
              </Button>

              {!addressOk && (
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Complete your delivery address to enable payment.
                </p>
              )}

              <p className="mt-3 text-center text-xs text-neutral-400">
                Secured by Razorpay · Test mode
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
