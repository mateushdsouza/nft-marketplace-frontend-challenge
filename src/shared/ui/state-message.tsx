import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

// Bloco usado nos estados de vazio e erro de qualquer tela.
export function StateMessage({
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  tone?: 'neutral' | 'error'
  className?: string
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center rounded-card border border-border bg-surface px-6 py-12 text-center',
        tone === 'error' && 'border-error/60',
        className,
      )}
    >
      <p className="text-lg font-bold">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
