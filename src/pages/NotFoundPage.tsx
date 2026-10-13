import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <>
      <title>Page not found – Ecomverse</title>
      <meta name="description" content="The page you are looking for does not exist." />
      <section className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <p className="text-6xl font-bold text-brand-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Page not found</h1>
        <p className="mt-2 text-neutral-500">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Go back home
        </Link>
      </section>
    </>
  )
}
