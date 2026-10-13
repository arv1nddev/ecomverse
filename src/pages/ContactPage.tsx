export function ContactPage() {
  return (
    <>
      <title>Contact – Ecomverse</title>
      <meta name="description" content="Contact Ecomverse. Email us at ecomversee@gmail.com." />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900">Contact</h1>
        <p className="mt-4 text-neutral-600">
          Have a question? Email us at{' '}
          <a
            href="mailto:ecomversee@gmail.com"
            className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            ecomversee@gmail.com
          </a>
          . We aim to reply within 1–2 business days.
        </p>
        <p className="mt-8 text-sm text-neutral-400 italic">[Contact page — placeholder]</p>
      </section>
    </>
  )
}
