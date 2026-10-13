# Ecomverse

A simple online dropshipping store for India. Customers pay with Razorpay; the store owner manually places supplier orders.

**Stack:** React + Vite + TypeScript + Tailwind CSS + React Router | Supabase (Postgres, Google auth, Storage, Edge Functions) | Razorpay (test mode)

---

## Quick start (frontend)

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in Supabase keys
cp .env.example .env
# Edit .env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# → http://localhost:5173

# 4. Type-check + production build
npm run build

# 5. Lint
npm run lint

# 6. Format
npm run format
```

---

## Database

1. Create a Supabase project.
2. SQL Editor → paste `supabase/migrations/20261010000000_init.sql` → Run.
   Optional: run `supabase/seed.sql` for placeholder products (delete before launch).
3. Authentication → Providers → enable **Google**, paste Client ID and Secret from Google Cloud, add Supabase's redirect URL to Google OAuth client.
4. Authentication → Users → Add user (admin email + password), then run:
   ```sql
   update public.profiles set is_admin = true where email = 'admin@example.com';
   ```
5. Google consent screen: move from Testing → In production before launch.

---

## Payment functions

Install the Supabase CLI, then from this folder:

```bash
supabase login
supabase link --project-ref <your-project-ref>

# Razorpay TEST keys first. Never put in frontend or git.
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-string

supabase functions deploy create-order
supabase functions deploy verify-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Razorpay Dashboard → Settings → Webhooks:
- URL: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
- Events: `order.paid`, `payment.failed`
- Secret: same `RAZORPAY_WEBHOOK_SECRET`

Switch to live keys only after a full test-mode run works.

---

## Pages

**Customer:** Home `/`, Shop `/shop`, Product `/shop/:slug`, Cart `/cart`, Login `/login`, Account `/account`, Checkout `/checkout`, Order success `/order-success`, My orders `/orders`, About `/about`, Contact `/contact`, Shipping `/shipping`, Returns `/returns`, Privacy `/privacy`, Terms `/terms`

**Admin (email + password):** `/admin` (login), `/admin/orders`, `/admin/products`, `/admin/categories`

---

## Design tokens

All colours and fonts live in `src/index.css` → `@theme { … }`. To change the accent colour, edit `--color-brand-*` in one place.

---

## Build order

1. ✅ Vite + React + Tailwind scaffold, layout, routes, lib helpers
2. Supabase auth (Google login + admin email/password) + Account address form
3. Catalog pages (products from Supabase)
4. Cart + checkout + Razorpay payment (test mode)
5. Admin portal
6. Policy pages, real products → Razorpay live approval
7. End-to-end test → switch to live keys

---

## Notes

- Supplier link and cost live in `product_supplier_info` — admin only.
- Shipping: free ≥ ₹500, else ₹70. Computed server-side in `create-order`.
- Prices stored in rupees; Razorpay amounts in paise (multiply × 100).
- Contact: ecomversee@gmail.com
