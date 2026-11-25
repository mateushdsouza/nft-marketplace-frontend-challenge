import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

// Quantidade inteira entre min e max. Usado no detalhe e no carrinho.
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label = 'Quantidade',
  disabled = false,
  className,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label?: string
  disabled?: boolean
  className?: string
}) {
  const buttonClass =
    'inline-flex size-8 items-center justify-center rounded-full bg-primary text-ink shadow-[0_4px_12px_rgb(20_13_10/0.15)] transition-opacity hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex items-center gap-3', className)}
    >
      <button
        type="button"
        className={buttonClass}
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className="min-w-6 text-center text-lg"
      >
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        aria-label="Aumentar quantidade"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
