/**
 * AccountPage – delivery address form.
 *
 * Allowed columns to update (from AGENTS.md):
 *   full_name, phone, address_line, city, state, pincode
 *
 * Phone is normalised before saving and validated with validation.ts.
 * Pincode validated with validation.ts.
 * is_admin, email and id are NEVER sent to the update call.
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { normalisePhone, phoneError, pincodeError } from '../lib/validation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

// ── Indian states list ────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

// ── Form state type ────────────────────────────────────────────────────────────

interface FormFields {
  full_name: string
  phone: string
  address_line: string
  city: string
  state: string
  pincode: string
}

interface FormErrors {
  full_name?: string
  phone?: string
  address_line?: string
  city?: string
  state?: string
  pincode?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AccountPage() {
  const { user, profile } = useAuth()

  const [fields, setFields] = useState<FormFields>(() => ({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address_line: profile?.address_line ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    pincode: profile?.pincode ?? '',
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // When the profile first loads from Supabase, populate the form.
  // We track the last synced profile id to avoid overwriting user edits.
  const syncedProfileId = useRef<string | null>(null)
  useEffect(() => {
    if (profile && profile.id !== syncedProfileId.current) {
      syncedProfileId.current = profile.id
      setFields({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        address_line: profile.address_line ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        pincode: profile.pincode ?? '',
      })
    }
  }, [profile])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Clear field-level error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setSuccessMsg(null)
    setErrorMsg(null)
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}

    const trimmedName = fields.full_name.trim()
    if (!trimmedName) errs.full_name = 'Full name is required.'
    else if (trimmedName.length < 2) errs.full_name = 'Please enter your full name.'

    const phoneErr = phoneError(fields.phone)
    if (phoneErr) errs.phone = phoneErr

    const trimmedAddr = fields.address_line.trim()
    if (!trimmedAddr) errs.address_line = 'Address is required.'
    else if (trimmedAddr.length < 5) errs.address_line = 'Please enter a complete address.'

    const trimmedCity = fields.city.trim()
    if (!trimmedCity) errs.city = 'City is required.'

    if (!fields.state) errs.state = 'Please select a state.'

    const pinErr = pincodeError(fields.pincode)
    if (pinErr) errs.pincode = pinErr

    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      // ONLY send the allowed columns – never send is_admin, email, or id
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fields.full_name.trim(),
          phone: normalisePhone(fields.phone),
          address_line: fields.address_line.trim(),
          city: fields.city.trim(),
          state: fields.state,
          pincode: fields.pincode.trim(),
        })
        .eq('id', user!.id)

      if (error) {
        console.error('[AccountPage] save error', error)
        setErrorMsg('Could not save your details. Please try again.')
      } else {
        setSuccessMsg('Address saved successfully!')
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <title>My Account – Ecomverse</title>
      <meta
        name="description"
        content="Manage your delivery address and account details on Ecomverse."
      />

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">My Account</h1>

        {/* Account info strip */}
        {user && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-5 py-4">
            <p className="text-sm text-neutral-500">Signed in as</p>
            <p className="mt-0.5 font-medium text-neutral-800">{user.email}</p>
          </div>
        )}

        {/* Address form */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-neutral-900">Delivery address</h2>
          <p className="mt-1 text-sm text-neutral-500">
            This address will be used for all your orders.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
          >
            {/* Full name – full width */}
            <div className="sm:col-span-2">
              <Input
                id="account-full-name"
                label="Full name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                value={fields.full_name}
                onChange={handleChange}
                error={errors.full_name}
                placeholder="As on your ID"
              />
            </div>

            {/* Phone */}
            <div className="sm:col-span-2">
              <Input
                id="account-phone"
                label="Mobile number"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                required
                value={fields.phone}
                onChange={handleChange}
                error={errors.phone}
                placeholder="10-digit Indian mobile (e.g. 9876543210)"
                hint="We strip the +91 prefix automatically."
              />
            </div>

            {/* Address line – full width */}
            <div className="sm:col-span-2">
              <Input
                id="account-address"
                label="Address"
                name="address_line"
                type="text"
                autoComplete="street-address"
                required
                value={fields.address_line}
                onChange={handleChange}
                error={errors.address_line}
                placeholder="House / flat no., street, area"
              />
            </div>

            {/* City */}
            <Input
              id="account-city"
              label="City"
              name="city"
              type="text"
              autoComplete="address-level2"
              required
              value={fields.city}
              onChange={handleChange}
              error={errors.city}
              placeholder="City"
            />

            {/* Pincode */}
            <Input
              id="account-pincode"
              label="Pincode"
              name="pincode"
              type="text"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={6}
              required
              value={fields.pincode}
              onChange={handleChange}
              error={errors.pincode}
              placeholder="6-digit pincode"
            />

            {/* State dropdown – full width */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label
                htmlFor="account-state"
                className="text-sm font-medium text-neutral-700"
              >
                State
                <span className="ml-0.5 text-error" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="account-state"
                name="state"
                required
                value={fields.state}
                onChange={handleChange}
                aria-invalid={!!errors.state}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-neutral-800 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white ${
                  errors.state
                    ? 'border-error focus:border-error focus:ring-error'
                    : 'border-neutral-300'
                }`}
              >
                <option value="">Select a state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="text-xs text-error" role="alert">
                  {errors.state}
                </p>
              )}
            </div>

            {/* Feedback messages */}
            {successMsg && (
              <div
                className="sm:col-span-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
                role="status"
              >
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div
                className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <div className="sm:col-span-2">
              <Button
                id="account-save-btn"
                type="submit"
                size="lg"
                loading={saving}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Save address
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
