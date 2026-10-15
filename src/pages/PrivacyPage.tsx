import { PolicyLayout, PolicySection, PolicyList, OwnerConfirm, MailtoLink } from '../components/layout/PolicyLayout'

export function PrivacyPage() {
  return (
    <>
      <title>Privacy policy – Ecomverse</title>
      <meta
        name="description"
        content="Ecomverse privacy policy. We collect only what we need to process your order. We do not sell your data."
      />
      {/* OWNER TO CONFIRM: date */}
      <PolicyLayout
        title="Privacy policy"
        lastUpdated={`Last updated: [OWNER TO CONFIRM: date]`}
      >
        <PolicySection heading="What we collect">
          <PolicyList>
            <li>
              Your name and email address, provided by Google when you sign in with Google.
            </li>
            <li>
              Your phone number and delivery address, which you enter on the Account page.
            </li>
            <li>
              Your order details (items, amounts, order status and tracking number).
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="How we use it">
          <PolicyList>
            <li>
              To process and deliver your orders, show your order status, and contact you
              about an order.
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="Who receives it">
          <PolicyList>
            <li>
              Razorpay processes your payment. We do not see or store your card, UPI or
              bank details.
            </li>
            <li>
              Our hosting and database providers (Vercel and Supabase) store the website
              data.
            </li>
            <li>
              Our suppliers and couriers receive your name, phone number and delivery
              address so they can deliver your order.
            </li>
            <li>We do not sell your personal data.</li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="Cookies and storage">
          <PolicyList>
            <li>
              This website stores your sign-in session and your shopping cart in your
              browser.{' '}
              <OwnerConfirm text="whether analytics will be added; if so, say so here." />
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection heading="Your choices">
          <PolicyList>
            <li>
              You can update your address on the Account page. To ask us to correct or
              delete your data, email <MailtoLink email="ecomversee@gmail.com" />.{' '}
              <OwnerConfirm text="how long order data is kept." />
            </li>
          </PolicyList>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
