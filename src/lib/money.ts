/**
 * Money formatting helpers – single source of truth for INR display.
 * All amounts stored/computed in integer rupees (not paise).
 * For Razorpay, multiply by 100 to get paise.
 */

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Format rupee amount for display. e.g. formatINR(499) → "₹499" */
export function formatINR(rupees: number): string {
  return formatter.format(rupees)
}

/** Convert rupees to Razorpay paise (integer). */
export function toPaise(rupees: number): number {
  return Math.round(rupees) * 100
}

/** Convert Razorpay paise to rupees (integer). */
export function toRupees(paise: number): number {
  return Math.round(paise / 100)
}
