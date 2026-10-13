/**
 * VariantPicker – renders option buttons for product variants (e.g. S / M / L, Black / White).
 * Only shown when variant_options is non-empty.
 * The chosen value is the string that gets sent to create-order.
 */

interface VariantPickerProps {
  options: string[]
  selected: string | null
  onSelect: (option: string) => void
  label?: string
}

export function VariantPicker({ options, selected, onSelect, label = 'Option' }: VariantPickerProps) {
  if (options.length === 0) return null

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-neutral-700">
        {label}
        {selected && <span className="ml-2 font-normal text-neutral-500">– {selected}</span>}
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Select ${label}`}>
        {options.map((option) => {
          const isSelected = option === selected
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 ${
                isSelected
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400 hover:text-brand-600'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
