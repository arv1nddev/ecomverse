export function ReturnsPage() {
  return (
    <>
      <title>Returns &amp; Refunds – Ecomverse</title>
      <meta name="description" content="Returns and refunds policy for Ecomverse." />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900">Returns &amp; Refunds</h1>
        <p className="mt-4 text-neutral-600">
          Refunds are available only if a payment was charged but the order was not confirmed. No
          refund is available after delivery. For payment issues contact us at{' '}
          <a
            href="mailto:ecomversee@gmail.com"
            className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            ecomversee@gmail.com
          </a>
          .
        </p>
        {/* TODO(owner): what happens if supplier is out of stock after payment? damaged or wrong item? */}
        <p className="mt-8 text-sm text-neutral-400 italic">
          [Returns page — placeholder; owner to review policy text]
        </p>
      </section>
    </>
  )
}
