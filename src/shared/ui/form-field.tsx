import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const inputClass =
  'h-10 w-full rounded-input border border-border bg-transparent px-4 text-sm text-foreground placeholder:text-secondary transition-colors focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error disabled:opacity-60'

type FieldProps = ComponentProps<'input'> & {
  id: string
  label: string
  error?: string
  hint?: string
}

// Rótulo visível, erro anunciado e ligado ao campo por aria-describedby.
export function TextField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: FieldProps) {
  const describedBy =
    [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(' ') ||
    undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-dica`} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="mt-1 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: FieldProps) {
  const [visible, setVisible] = useState(false)
  const describedBy =
    [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(' ') ||
    undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, 'pr-11')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-secondary hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {hint && !error && (
        <p id={`${id}-dica`} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="mt-1 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-input border border-error/60 bg-error/10 px-3 py-2 text-sm text-foreground"
    >
      {message}
    </p>
  )
}
