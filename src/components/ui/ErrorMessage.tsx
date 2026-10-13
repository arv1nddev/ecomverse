interface ErrorMessageProps {
  message?: string | null
  title?: string
}

export function ErrorMessage({ message, title = 'Something went wrong' }: ErrorMessageProps) {
  if (!message) return null
  return (
    <div
      className="rounded-lg border border-error/30 bg-error/5 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-error">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{message}</p>
    </div>
  )
}
