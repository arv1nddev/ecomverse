import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2" aria-label="Ecomverse home">
              <img
                src="/logo.svg"
                alt="Ecomverse"
                className="h-7 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (sibling) sibling.style.display = 'block'
                }}
              />
              <span className="hidden text-base font-bold text-neutral-900" aria-hidden="true">
                Ecomverse
              </span>
            </Link>
            <p className="text-sm text-neutral-500">
              Quality products. Fast delivery across India.
            </p>
            <a
              href="mailto:ecomversee@gmail.com"
              className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              ecomversee@gmail.com
            </a>
          </div>

          {/* Shop links */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Shop
            </h2>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/shop" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  All products
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  My orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Policy links */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Information
            </h2>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/about" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Shipping
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Returns &amp; refunds
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-100 pt-6 text-center">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Ecomverse. All rights reserved. India only &bull; INR &bull; Razorpay secured.
          </p>
        </div>
      </div>
    </footer>
  )
}
