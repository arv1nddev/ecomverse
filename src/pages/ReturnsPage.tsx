import { PolicyLayout, PolicySection, PolicyList, OwnerConfirm, MailtoLink } from '../components/layout/PolicyLayout'

export function ReturnsPage() {
  return (
    <>
      <title>Returns &amp; refunds – Ecomverse</title>
      <meta
        name="description"
        content="Ecomverse returns and refunds policy. No cancellations after order placed. Contact us for payment issues."
      />
      <PolicyLayout title="Returns and refunds policy">
        <PolicySection>
          <PolicyList>
            <li>Once an order is placed it cannot be cancelled.</li>
            <li>Once an order has been delivered, it is not eligible for a refund.</li>
            <li>
              If your payment was charged but your order was not placed (for example the
              payment failed or the page closed unexpectedly), contact us with the payment
              details. After we confirm it, we refund the full amount to your original
              payment method{' '}
              <OwnerConfirm text="refund time, e.g. within 5-7 business days" />.
            </li>
            <li>
              <OwnerConfirm text="what happens if a product turns out to be out of stock after payment: refund, replacement, or choice." />
            </li>
            <li>
              <OwnerConfirm text="what happens if an item arrives damaged, defective or different from the order, and how long the customer has to report it." />
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="Contact">
          <p>
            <MailtoLink email="ecomversee@gmail.com" />
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
