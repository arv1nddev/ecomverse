import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
            {label}
            {props.required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-neutral-300'
          } disabled:bg-neutral-100 disabled:cursor-not-allowed ${className}`}
        />
        {error && (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
