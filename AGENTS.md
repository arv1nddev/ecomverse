# AGENTS.md: Ecomverse

Instructions for any AI coding agent working in this repo. The owner will NOT be available to answer design questions in detail, so this file and the docs it points to are the full specification. When something is undecided, follow "Undecided items" below instead of stopping.

## Read order (every session)
1. This file  2. `docs/PROJECT_BRIEF.md`  3. `docs/PROGRESS.md`  4. `README.md`  5. `docs/AGENT_PROMPTS.md` (find the current task)

## Project
Ecomverse is a small dropshipping store for India. After a customer pays, the owner places the supplier order **manually**. It is a simple side business used for testing, so favour simple, boring, working solutions over clever ones.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS + React Router. Hosted on Vercel.
- Backend: Supabase only (Postgres, Google auth, email/password auth for admin, Storage, Edge Functions in Deno/TypeScript).
- Payments: Razorpay (Checkout.js in the browser, verification in Edge Functions).
- Everything must run on **free tiers**. No paid services, no new third-party accounts.

## Pre-approved dependencies (anything else: ask first)
react, react-dom, react-router-dom, @supabase/supabase-js, tailwindcss (+ its Vite plugin or PostCSS setup), typescript, eslint + typescript-eslint + react-hooks plugin (Vite template defaults), prettier + eslint-config-prettier, browser-image-compression, lucide-react.

## Source of truth
- Database: `supabase/migrations/` (starting with `20261010000000_init.sql`). Schema, RLS and storage policies already exist and are applied.
- Payments: `supabase/functions/create-order`, `verify-payment`, `razorpay-webhook` (deployed in Razorpay TEST mode).
- Behaviour and scope: `docs/PROJECT_BRIEF.md`. Policy page text: `docs/POLICIES_DRAFT.md`.

## Boundaries
You MAY: edit anything under `src/`, `public/`, `docs/`, config files, and add NEW migration files.
You MAY NOT, without the owner's explicit say-so in the chat:
- edit an existing migration, weaken RLS, or change the three payment functions (if you find a bug in them, explain it and propose a fix instead);
- run `supabase functions deploy`, `supabase secrets ...`, `supabase db push`, or anything that changes the hosted project. Instead, list the exact command under "Human actions needed";
- create or edit `.env` files containing real keys, or print/echo any secret;
- use Razorpay **live** keys, ever. Development is test mode only;
- delete files you did not create, or run destructive git commands (`reset --hard`, force push).

## Hard rules
1. **No secrets in the frontend or in git.** The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Razorpay secrets and the Supabase service role key exist only as Supabase function secrets. Never create a `VITE_` variable for them.
2. **Prices, shipping and totals are computed only on the server** (`create-order`). The browser sends only `{ product_id, quantity, variant }`. Totals shown in the UI are estimates; the server's amount is final.
3. Customers cannot write to `orders` or `order_items`; only Edge Functions do.
4. **Supplier link and cost must never reach customer-facing queries.** They live in `product_supplier_info` (admin only). Never `select('*, product_supplier_info(*)')` on customer pages.
5. Hiding a button or route is UX only. Real protection is RLS; never rely on client-side `isAdmin` checks for security.
6. Do not invent business rules, policy or legal text. Use `[OWNER TO CONFIRM: ...]` (in policy text) or `TODO(owner)` (in code) and list each in your report.

## Out of scope: do NOT build
Guest checkout, cash on delivery, GST/tax lines or GST invoices, any email or SMS sending, phone OTP, customer password login or email verification, multiple saved addresses, refund or cancellation buttons, supplier APIs or auto-ordering, CSV import, data export, coupons, reviews, wishlists, multi-vendor, multiple languages, dark mode, order notes, admin notifications. If a task seems to need one, skip it and mention it in your report.

## Business rules (final)
- Customers: **Google sign-in only**. Admin (1 to 2 people): **email + password**, `profiles.is_admin = true`.
- One delivery address per customer on `profiles`: full_name, phone, address_line, city, state, pincode. Orders copy the address at order time.
- India only. INR. Prices are final: no GST shown. Database stores rupees; Razorpay amounts are **paise** (integers).
- Shipping: free if items subtotal >= Rs 500, else Rs 70 (values in `store_settings`). Delivery text from `store_settings.delivery_estimate` ("9-10 days").
- Order status: `new`, `ordered_from_supplier`, `shipped`, `delivered`, `cancelled`. Payment status: `pending`, `paid`, `failed`. Admin changes order status and types the tracking number by hand.
- Admin orders list shows only `paid` orders by default. Customer "My orders" shows only `paid` orders.
- After payment: on-screen order number only (no email). Cart lives in localStorage; login required only at checkout.
- Refunds: only for payments charged but failed. None after delivery. Owner handles them in the Razorpay dashboard (no refund UI).
- Public contact email: ecomversee@gmail.com.

## Data access cheat sheet
- Anyone: read `categories`, active `products`, `product_images`, `store_settings`.
- Signed-in customer: read own `profiles` row and update ONLY full_name, phone, address_line, city, state, pincode; read own `orders` and `order_items`.
- Admin: full CRUD on catalog tables and `product_supplier_info`; read all orders; update orders (status, tracking_number); upload to storage bucket `product-images`.
- Edge Functions (service role): insert orders and order_items; update payment fields.

## Gotchas (read before coding)
- Profile updates: never send `is_admin`, `email` or `id`; the update will be rejected.
- Phone must match `^[6-9][0-9]{9}$`; pincode `^[1-9][0-9]{5}$`. Strip spaces, "+91" and a leading 0 from phone input before saving; show friendly validation messages.
- A profile row is created by a database trigger at first login. Fetch it after sign-in and retry briefly if it is not there yet.
- `supabase.functions.invoke` returns a generic error for non-2xx responses. Read the real message with `await error.context.json()` (field `error`) and show that to the customer.
- Razorpay: load `https://checkout.razorpay.com/v1/checkout.js` dynamically. Pass `key_id`, `amount`, `currency`, `order_id` and `prefill` exactly as returned by `create-order`. In `handler`, send the whole response (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`) to `verify-payment`. Disable the Pay button while processing (no double clicks). Handle `rzp.on('payment.failed')` and modal dismissal with a friendly message. If `verify-payment` fails AFTER a successful payment, tell the customer "Payment received, we are confirming your order; check My orders shortly" and never ask them to pay again (the webhook will mark it paid).
- Variants: if `variant_options` is empty there is no variant (send `null`); otherwise the customer must pick one and the chosen string is sent.
- Product images: public URL via `supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl`. Main image has `sort_order = 0`. Order items keep a snapshot (`product_name`, `unit_price`, `image_path`); show those on order pages, do not join to products for customers.
- Inactive products are invisible to customers (RLS); treat "not found" as a normal 404 page.
- Numeric columns: wrap with `Number()` before maths. Use integer paise for any calculation, never float rupees.
- Admin order list query (admin only): `orders(*, order_items(*, products(name, product_supplier_info(supplier_url))))` filtered by `payment_status = 'paid'`.
- Supabase auth redirect after Google login returns to the site origin; remember the page the customer came from (sessionStorage) and navigate back after login.
- Do not generate image/asset binaries or committed secrets. Generated DB types: `npx supabase gen types typescript --project-id <ref> > src/types/database.ts` (list as a Human action).

## Undecided items
Open policy questions (supplier out of stock after payment, damaged or wrong item, calendar vs business days, grievance contact, legal business name and address) are the owner's to decide. Never block on them: choose the simplest option that fits the out-of-scope list, mark it `[OWNER TO CONFIRM: ...]` / `TODO(owner)`, continue, and report it. Before launch, `grep -rn "OWNER TO CONFIRM\|TODO(owner)" src docs` must be clean; list remaining ones in `docs/OWNER_CHECKLIST.md`.

## Conventions
- TypeScript for all new frontend code; small components, one per file; shared UI in `src/components/ui`.
- Mobile first (most customers use phones). Clean, minimal, professional look; keep all colors in CSS variables / Tailwind theme tokens in one place so the theme can change later. Use the logo in `public/` and a neutral palette derived from it until the owner picks a theme.
- Money formatting: one helper in `src/lib/money.ts` (INR, `en-IN`, no decimals unless needed).
- Every data fetch needs loading, empty and error states. Never show raw database or function errors to customers.
- Accessibility basics: labelled inputs, alt text, keyboard-usable controls, visible focus.
- Page titles and meta descriptions per page.

## Commands
```
npm install
npm run dev
npm run build     # must pass
npm run lint      # must pass
```

## Definition of done (every task)
- `npm run build` and `npm run lint` pass with no errors.
- Works at phone width and desktop width.
- Payment-related work tested in Razorpay TEST mode only.
- `docs/PROGRESS.md` updated (date, what was done, what is next, known issues).
- Final report contains: (1) files changed, (2) what you did NOT touch, (3) OWNER TO CONFIRM / TODO(owner) items, (4) "Human actions needed" with exact commands or dashboard steps, (5) how the owner can test it.

## Current status
Owner reports as done: Supabase project created, migration applied, Google provider and Google Cloud project set up, Razorpay test keys stored as Supabase secrets, the three functions deployed, Razorpay test-mode webhook added, GitHub repo pushed, Vercel project created. Verify anything you depend on by testing it, and say so if it does not work.
Pending from the client: 20 products with 3 images each, theme colors. Logo is available. Until real data arrives use `supabase/seed.sql` placeholders (slugs start with `sample-`).
