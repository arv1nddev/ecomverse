export function ShippingPage() {
  return (
    <>
      <title>Shipping – Ecomverse</title>
      <meta name="description" content="Shipping policy and delivery times for Ecomverse orders." />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900">Shipping</h1>
        <ul className="mt-4 space-y-2 text-neutral-600">
          <li>Delivery in 9–10 days across India.</li>
          <li>Free shipping on orders ₹500 and above.</li>
          <li>₹70 shipping fee on orders below ₹500.</li>
        </ul>
        {/* TODO(owner): confirm whether 9-10 days means calendar or business days */}
        <p className="mt-8 text-sm text-neutral-400 italic">[Shipping page — placeholder; owner to review policy text]</p>
      </section>
    </>
  )
}
