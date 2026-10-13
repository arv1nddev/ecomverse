/**
 * Validation helpers for customer-facing forms.
 * Rules from AGENTS.md:
 *   phone  → /^[6-9][0-9]{9}$/ (strip spaces, "+91", leading 0 first)
 *   pincode → /^[1-9][0-9]{5}$/
 */

/** Normalise phone input: strip spaces, "+91" prefix, and a single leading 0. */
export function normalisePhone(raw: string): string {
  let p = raw.trim().replace(/\s+/g, '')
  if (p.startsWith('+91')) p = p.slice(3)
  else if (p.startsWith('91') && p.length === 12) p = p.slice(2)
  if (p.startsWith('0') && p.length === 11) p = p.slice(1)
  return p
}

/** Validate a normalised (10-digit) Indian mobile number. */
export function isValidPhone(phone: string): boolean {
  return /^[6-9][0-9]{9}$/.test(phone)
}

/** Validate an Indian pincode (6 digits, no leading 0). */
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode.trim())
}

/**
 * Validate and return a friendly error message, or null if valid.
 * Use this in form onChange / onBlur handlers.
 */
export function phoneError(raw: string): string | null {
  const normalised = normalisePhone(raw)
  if (!normalised) return 'Phone number is required.'
  if (!isValidPhone(normalised)) return 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).'
  return null
}

export function pincodeError(raw: string): string | null {
  const p = raw.trim()
  if (!p) return 'Pincode is required.'
  if (!isValidPincode(p)) return 'Enter a valid 6-digit pincode.'
  return null
}
