import { PolicyLayout, PolicySection, PolicyList, OwnerConfirm } from '../components/layout/PolicyLayout'

export function ShippingPage() {
  return (
    <>
      <title>Shipping policy – Ecomverse</title>
      <meta
        name="description"
        content="Ecomverse ships across India. Free shipping on orders ₹500 and above; ₹70 below that. Delivered in 9–10 days."
      />
      <PolicyLayout title="Shipping policy">
        <PolicySection>
          <PolicyList>
            <li>We deliver across India only.</li>
            <li>
              Shipping is ₹70 on orders with items totalling less than ₹500, and free on
              orders of ₹500 or more (the item total before shipping).
            </li>
            <li>
              Orders are delivered in 9–10{' '}
              <OwnerConfirm text="calendar days or business days" /> after your order is
              placed. Products are dispatched from our partner suppliers, so delivery can
              take longer than you may be used to.
            </li>
            <li>
              When your order ships, the tracking number appears in "My orders" on this
              website. We do not send email or SMS updates.
            </li>
            <li>
              Delays caused by couriers, weather, strikes or other events beyond our
              control may extend delivery time.
            </li>
            <li>
              Please make sure your delivery address and phone number are correct; couriers
              need them to reach you.
            </li>
          </PolicyList>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
