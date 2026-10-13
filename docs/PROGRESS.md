# Progress log

The agent appends an entry after every task: date, task, what was done, what is next, known issues.

## 2026-10-11: Backend ready (before frontend)
- Done: database migration, RLS, storage policies, seed data, Edge Functions (create-order, verify-payment, razorpay-webhook) deployed in Razorpay test mode, docs and agent rules written.
- Owner reports: Supabase project, Google provider, Razorpay test keys as secrets, webhook (test mode), GitHub repo and Vercel project all set up.
- Next: Task 1 in docs/AGENT_PROMPTS.md (frontend scaffold).
- Known issues / open: policy decisions marked OWNER TO CONFIRM; theme undecided; real products and images pending.

## 2026-10-14: Task 1 – Frontend scaffold

- **Done:** Installed react-router-dom, @supabase/supabase-js, tailwindcss (@tailwindcss/vite), prettier, eslint-config-prettier. Created: `src/lib/supabase.ts` (client with clear error on missing env vars), `src/lib/money.ts` (INR formatter, paise helpers), `src/lib/validation.ts` (phone normalisation + validation, pincode validation per AGENTS.md rules). Design tokens in `src/index.css` via Tailwind v4 `@theme` (stone neutral + teal accent – easy to change). Shared UI components: Button, Input, Spinner, ErrorMessage, EmptyState. Layout: Header (logo fallback to text wordmark, sticky, mobile menu, cart badge, sign-in/account), Footer (policy links, ecomversee@gmail.com). All 14 customer + 4 admin placeholder pages, 404 page. React Router `createBrowserRouter` wiring all routes. Updated `index.html` (Inter font, meta description), `README.md` (run instructions, scripts). ESLint now excludes `supabase/` (Deno files). `npm run build` and `npm run lint` both pass with 0 errors.
- **Not touched:** `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.env.example`, `vercel.json`, `docs/`, `supabase/` (migrations, functions, seed), `public/logo.svg`, `public/favicon.svg`.
- **Next:** Task 2 in docs/AGENT_PROMPTS.md (Supabase auth – Google login + admin email/password + Account address form with validation).
- **TODO(owner):** Privacy and Terms pages need full legal text before Razorpay live approval. Shipping page has TODO(owner) for calendar vs business days. Returns page has TODO(owner) for out-of-stock-after-payment and damaged/wrong-item policy. Theme/accent colour undecided – change `--color-brand-*` in `src/index.css`.


## 2026-10-14: Task 2 – Authentication + Account page

- **Done:** Created `src/context/AuthContext.tsx` (AuthProvider + useAuth hook + consumeReturnPath): exposes session, user, profile (from `public.profiles`), isAdmin, loading, signInWithGoogle (saves returnPath to sessionStorage before OAuth redirect), signOut. Profile fetch retries up to 5× with growing delays to survive the brief DB trigger window after Google login. Created `src/components/auth/RequireAuth.tsx`: spinner while loading, then Navigate to /login (saving current path) if unauthenticated. Rewrote `src/pages/LoginPage.tsx`: single "Continue with Google" button, inline Google G logo, friendly error handling, navigates back to return path on successful auth. Rewrote `src/pages/AccountPage.tsx`: full delivery address form (full_name, phone, address_line, city, state dropdown with all 36 Indian states/UTs, pincode). Validation via `src/lib/validation.ts`. Save sends only the five allowed columns – is_admin, email and id never included. Success/error banners. Updated `src/components/layout/Header.tsx`: reads auth from AuthContext (no prop); logged-out → Sign in button; logged-in → name/initial avatar + desktop dropdown (Account, My orders, Sign out) + mobile menu expanded items. Updated `src/components/layout/AppLayout.tsx`: wraps with AuthProvider, removed isLoggedIn prop. Updated `src/routes/router.tsx`: /account, /orders, /checkout, /order-success wrapped with RequireAuth. `npm run build` and `npm run lint` pass with 0 errors.
- **Not touched:** AGENTS.md, .gitignore, .env.example, vercel.json, supabase/, public/, src/lib/, src/types/database.ts, all other page files, Footer.tsx, index.css.
- **Next:** Task 3 in docs/AGENT_PROMPTS.md (catalog pages – products from Supabase).
- **TODO(owner):** None new from this task.
- **Known issues / open:** Admin pages have no client-side guard yet (real protection is RLS; UI guard added in Task 5). Vite chunk-size warning is cosmetic only.

## 2026-10-14: Task 3 – Catalog (Home, Shop, Product)

- **Done:**
  - Created `src/lib/catalog.ts`: typed Supabase query functions (`fetchCategories`, `fetchProducts`, `fetchProductBySlug`, `fetchStoreSettings`, `getImageUrl`). Strictly never selects `product_supplier_info` (Hard Rule 4). Normalises image ordering (`sort_order`) and category relation. Handles PGRST116 (missing / inactive) as null for 404 display.
  - Created `src/components/product/ProductCard.tsx`: product card for Home and Shop grids with main image / placeholder, INR formatted price, out-of-stock badge, link to `/product/:slug`.
  - Created `src/components/product/ProductImageGallery.tsx`: displays main image (sort_order 0) with up to 5 thumbnails and image placeholder fallback.
  - Created `src/components/product/VariantPicker.tsx`: option buttons for variant options when non-empty.
  - Created `src/context/CartContext.tsx`: CartProvider and useCart hook stub so ProductPage can invoke `addToCart` cleanly ahead of Task 4.
  - Rewrote `src/pages/HomePage.tsx`: hero banner with "Shop now" button, category tiles row linking to filtered shop view (`/shop?category=:slug`) plus "All products" tile, latest arrivals product grid (up to 8 products), loading/error/empty states.
  - Rewrote `src/pages/ShopPage.tsx`: loads active products and categories once on mount, client-side category filter (synced with URL search params), instant text search on product name and description, sort by newest and price low-to-high / high-to-low, clear filters action, loading/error/empty states.
  - Rewrote `src/pages/ProductPage.tsx`: image gallery, title, price, feature bullets list, short description, variant selector (required when options exist), quantity stepper (1-99), "Add to cart" button (disabled and labelled "Out of stock" when `in_stock` is false, or prompts to select an option), delivery estimate and free shipping threshold / delivery charge loaded from `store_settings`, breadcrumb navigation, and 404 state.
  - Updated `src/routes/router.tsx`: added `/product/:slug` route (in addition to `/shop/:slug`).
  - Updated `src/components/layout/AppLayout.tsx`: wrapped layout in `CartProvider`.
  - `npm run build` and `npm run lint` pass with 0 errors.
- **Not touched:** `supabase/migrations/`, `supabase/functions/`, `docs/POLICIES_DRAFT.md`, `src/pages/admin/*`, `src/pages/AccountPage.tsx`, `src/pages/LoginPage.tsx`, static policy pages, `src/lib/money.ts`, `src/lib/validation.ts`.
- **Next:** Task 4 in docs/AGENT_PROMPTS.md (Cart – localStorage persistence, Cart page, line totals, free shipping progress hint).
- **TODO(owner):** None new from this task (existing policy TODOs remain documented in Task 1 log).
- **Known issues / open:** CartContext `addToCart` is currently a stub that records action and confirms via UI notification banner; fully wired to localStorage and cart drawer/page in Task 4.

