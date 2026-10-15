import { PolicyLayout, PolicySection, OwnerConfirm, MailtoLink } from '../components/layout/PolicyLayout'

export function ContactPage() {
  return (
    <>
      <title>Contact us – Ecomverse</title>
      <meta
        name="description"
        content="Contact Ecomverse. Email us at ecomversee@gmail.com and we'll reply as soon as we can."
      />
      <PolicyLayout title="Contact us">
        <PolicySection>
          <p>
            Email:{' '}
            <MailtoLink email="ecomversee@gmail.com" />
          </p>
          <p className="mt-3">
            We aim to reply within{' '}
            <OwnerConfirm text="reply time, e.g. 2 working days" />.
          </p>
          <p className="mt-3">
            <OwnerConfirm text="legal or trading name and business address, and an optional phone or WhatsApp number." />
          </p>
        </PolicySection>

        <PolicySection>
          <p className="text-sm text-neutral-500">
            Please include your order number (for example ECV-1001) in any message about
            an order.
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
