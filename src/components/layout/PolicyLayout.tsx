/**
 * PolicyLayout – shared wrapper for all static / policy pages.
 *
 * Renders a centred, readable prose column with a page title and optional
 * last-updated note. Children are rendered as-is inside the prose area.
 */

import type { ReactNode } from 'react'

interface PolicyLayoutProps {
  title: string
  lastUpdated?: string
  children: ReactNode
}

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
      {lastUpdated && (
        <p className="mt-2 text-sm text-neutral-400">{lastUpdated}</p>
      )}
      <div className="mt-8 flex flex-col gap-6 text-neutral-700 leading-relaxed text-[15px]">
        {children}
      </div>
    </div>
  )
}

// ── Small building blocks used by policy pages ─────────────────────────────────

/** A section with an optional heading and body. */
export function PolicySection({
  heading,
  children,
}: {
  heading?: string
  children: ReactNode
}) {
  return (
    <section>
      {heading && (
        <h2 className="mb-3 text-base font-semibold text-neutral-900">{heading}</h2>
      )}
      {children}
    </section>
  )
}

/** Unordered list item wrapper. */
export function PolicyList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 list-disc pl-5 marker:text-neutral-400">
      {children}
    </ul>
  )
}

/** A visually distinct "[OWNER TO CONFIRM: …]" callout. Preserves the marker text exactly. */
export function OwnerConfirm({ text }: { text: string }) {
  return (
    <span
      className="inline-block rounded bg-amber-50 border border-amber-300 px-1.5 py-0.5 text-xs font-mono text-amber-700"
      // The marker is kept in the DOM for grep to find (AGENTS.md requirement)
      data-owner-confirm
    >
      {/* OWNER TO CONFIRM: {text} */}
      [OWNER TO CONFIRM: {text}]
    </span>
  )
}

/** A contact email mailto link. */
export function MailtoLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
    >
      {email}
    </a>
  )
}
