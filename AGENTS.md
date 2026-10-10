# AGENTS.md: Ecomverse

Instructions for any AI coding agent working in this repo. Read this file, then `docs/PROJECT_BRIEF.md`, then `README.md`, before writing code.

## Project
Ecomverse is a small dropshipping store for India. The owner places supplier orders **manually** after customers pay. It is a simple side business used for testing, so favour simple, boring, working solutions over clever ones.

## Stack
- Frontend: React + Vite + Tailwind CSS, React Router. Hosted on Vercel (free plan for now).
- Backend: Supabase only (Postgres, Google auth, email/password auth for admin, Storage, Edge Functions in Deno/TypeScript).
- Payments: Razorpay (Checkout.js in browser, verification in Edge Functions).
- Everything must run on **free tiers**. Do not add paid services or paid features.

## Source of truth
- Database: `supabase/migrations/` (start with `20261010000000_init.sql`). The schema, RLS policies and storage policies already exist; do not weaken them.
- Payments: `supabase/functions/create-order`, `verify-payment`, `razorpay-webhook`.
- Behaviour and scope: `docs/PROJECT_BRIEF.md`.
- Never change the schema, RLS or the payment functions without asking first. Schema changes go in a **new migration file**, never by editing an old one.

## Hard rules
1. **No secrets in the frontend or in git.** The frontend may use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Razorpay secret, webhook secret and the Supabase service role key exist only as Supabase function secrets.
2. **Prices, shipping and totals are computed only on the server** (`create-order`). The browser never sends prices or totals.
3. Customers cannot write to `orders` or `order_items`; only Edge Functions (service role) do.
4. **Supplier link and supplier cost must never reach customer-facing queries.** They live in `product_supplier_info` (admin only).
5. Ask before adding any dependency, and prefer what is already installed.
6. No new paid services, no new third-party accounts.
7. Do not invent business rules, policy text or legal text. Use placeholders marked `TODO(owner)` and list them in your summary.

## Out of scope: do NOT build
Guest checkout, cash on delivery, GST/tax lines or GST invoices, any email or SMS sending, phone OTP, email verification flows for customers, password login for customers, multiple saved addresses, refund or cancellation buttons for customers, supplier APIs or auto-ordering, CSV import, data export, coupons, reviews, wishlists, multi-vendor, multiple languages, dark mode. If a task seems to need one of these, stop and ask.

## Business rules (already decided)
- Customers sign in with **Google only**. Admin (1 to 2 people) signs in with **email + password**; admin = `profiles.is_admin = true`.
- One delivery address per customer, stored on `profiles`. Fields: name, phone (10-digit Indian mobile), address, city, state, pincode (6 digits). Orders copy the address at order time.
- India only. Currency INR. Prices are final (not tax-inclusive, no GST shown). Database stores rupees; Razorpay amounts are in **paise**.
- Shipping: free if items subtotal is Rs 500 or more, otherwise Rs 70. Values live in `store_settings`. Delivery time text: "9-10 days" (from `store_settings.delivery_estimate`).
- Order status: `new`, `ordered_from_supplier`, `shipped`, `delivered`, `cancelled`. Payment status: `pending`, `paid`, `failed`. Admin changes order status by hand and types the tracking number by hand.
- Admin orders list shows only `payment_status = 'paid'` by default.
- After payment the customer sees an on-screen order number (no email).
- Cart is kept in localStorage. Login is required at checkout, not for browsing.
- Refunds: only for payments that were charged but failed. No refunds after delivery. Handled by the owner in the Razorpay dashboard (no refund UI).
- Public contact email: ecomversee@gmail.com.

## Planned structure
```
src/
  lib/            supabase client, helpers (money, validation)
  components/     shared UI
  pages/          customer pages
  pages/admin/    admin pages (guarded by is_admin)
  context/        auth + cart
supabase/
  migrations/     SQL migrations
  functions/      Edge Functions (+ _shared)
  seed.sql        PLACEHOLDER sample data (delete before launch)
docs/PROJECT_BRIEF.md
```

## Commands
```
npm install
npm run dev            # local frontend
npm run build          # must pass before a task is "done"
npm run lint           # if configured
supabase functions deploy create-order
supabase functions deploy verify-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```
After `supabase init`, make sure `supabase/config.toml` has `[functions.razorpay-webhook]` with `verify_jwt = false`.

## Conventions
- TypeScript preferred for new frontend code; keep components small and in their own files.
- Mobile first; most customers will be on phones.
- Money: use one helper to format rupees (Rs symbol, no decimals unless needed). Never use floating-point maths for totals; use integers (paise) when calculating.
- Show clear loading and error states; never show raw database or function errors to customers.
- Images: use compressed WebP (about 1000 px wide). Main image is `sort_order = 0`.
- Accessibility basics: labels on inputs, alt text on images, keyboard-usable buttons.

## Definition of done
- `npm run build` passes with no errors.
- The feature works on a phone-sized screen.
- Payment changes were tested in **Razorpay test mode** (never live keys during development).
- You listed what you changed, what you did not touch, and any `TODO(owner)` items.

## How to work
- One feature per task. Plan briefly, then implement, then summarize.
- If the request conflicts with this file, say so and ask instead of guessing.
- Keep diffs small and focused; do not refactor unrelated code.

## Current status
- Done: database schema, RLS, storage policies, three payment Edge Functions, README.
- Waiting on the client: 20 products (sheet) and 3 images each (Drive folder), theme/colors. Logo is available.
- Until real data arrives, use `supabase/seed.sql` placeholder products.
