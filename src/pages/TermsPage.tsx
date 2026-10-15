import { PolicyLayout, PolicySection, PolicyList, OwnerConfirm, MailtoLink } from '../components/layout/PolicyLayout'

export function TermsPage() {
  return (
    <>
      <title>Terms and conditions – Ecomverse</title>
      <meta
        name="description"
        content="Ecomverse terms and conditions. Prices in INR. Orders confirmed after payment. Governed by Indian law."
      />
      {/* OWNER TO CONFIRM: date */}
      <PolicyLayout
        title="Terms and conditions"
        lastUpdated={`Last updated: [OWNER TO CONFIRM: date]`}
      >
        <PolicySection>
          <PolicyList>
            <li>By using Ecomverse you agree to these terms.</li>
            <li>
              Products, prices and availability can change without notice. All prices are
              in Indian rupees (INR).{' '}
              <OwnerConfirm text="whether prices include any taxes; currently prices are shown as final and no GST is charged." />
            </li>
            <li>
              An order is confirmed only after payment is received. We may cancel an order
              if a product is unavailable or an error in price or description is found{' '}
              <OwnerConfirm text="and refund the amount paid" />.
            </li>
            <li>
              Payments are processed by Razorpay and are subject to their terms.
            </li>
            <li>
              Delivery, returns and refunds are governed by the{' '}
              <a
                href="/shipping"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                Shipping policy
              </a>{' '}
              and the{' '}
              <a
                href="/returns"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                Returns and refunds policy
              </a>
              .
            </li>
            <li>
              You must give accurate information and use the site lawfully.
            </li>
            <li>
              To the extent permitted by law, we are not liable for indirect losses or for
              delays outside our control.
            </li>
            <li>
              These terms are governed by the laws of India.{' '}
              <OwnerConfirm text="city or state for disputes." />
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="Questions">
          <p>
            <MailtoLink email="ecomversee@gmail.com" />
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
