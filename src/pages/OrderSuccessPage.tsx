/**
 * OrderSuccessPage – /order-success/:orderNumber
 *
 * Shows a thank-you, the order number, delivery estimate, and a link to My orders.
 * Access is gated by RequireAuth; RLS further ensures only the owner of the order
 * can reach their own confirmation (the order number is not guessable).
 */

import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchDeliveryEstimate } from '../lib/orders'

export function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const [deliveryEstimate, setDeliveryEstimate] = useState('9-10 days')

  // If no order number in URL, someone navigated here directly – send them home
  useEffect(() => {
    if (!orderNumber) {
      navigate('/', { replace: true })
      return
    }
    fetchDeliveryEstimate()
      .then(setDeliveryEstimate)
      .catch(() => { /* use default */ })
  }, [orderNumber, navigate])

  if (!orderNumber) return null

  return (
    <>
      <title>Order confirmed – Ecomverse</title>
      <meta
        name="description"
        content={`Your order ${orderNumber} has been placed successfully.`}
      />

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Order confirmed!
        </h1>

        <p className="mt-3 text-neutral-600">
          Thank you for your purchase. Your order number is:
        </p>

        <div className="mt-4 inline-block rounded-xl border-2 border-brand-200 bg-brand-50 px-6 py-3">
          <p
            id="order-number-display"
            className="text-xl font-bold tracking-wider text-brand-700"
            aria-label={`Order number ${orderNumber}`}
          >
            {orderNumber}
          </p>
        </div>

        <p className="mt-6 text-sm text-neutral-600">
          Estimated delivery:{' '}
          <span className="font-medium text-neutral-800">{deliveryEstimate}</span>
        </p>

        <p className="mt-2 text-sm text-neutral-500">
          You can track your order status in{' '}
          <Link to="/orders" className="font-medium text-brand-600 underline hover:text-brand-700">
            My orders
          </Link>
          . No email confirmation is sent.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/orders"
            id="go-to-orders-link"
            className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            View my orders
          </Link>
          <Link
            to="/shop"
            id="continue-shopping-success-link"
            className="rounded-lg border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </>
  )
}
