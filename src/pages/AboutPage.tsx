import { PolicyLayout, PolicySection, OwnerConfirm, MailtoLink } from '../components/layout/PolicyLayout'

export function AboutPage() {
  return (
    <>
      <title>About us – Ecomverse</title>
      <meta
        name="description"
        content="Learn about Ecomverse – hand-picked everyday products delivered across India."
      />
      <PolicyLayout title="About us">
        <PolicySection>
          <p>
            Ecomverse brings a hand-picked range of everyday products to your door across
            India.{' '}
            <OwnerConfirm text="one or two sentences about the brand and what it sells." />
          </p>
        </PolicySection>

        <PolicySection heading="Get in touch">
          <p>
            Questions? Email us at <MailtoLink email="ecomversee@gmail.com" /> and we'll
            be happy to help.
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
