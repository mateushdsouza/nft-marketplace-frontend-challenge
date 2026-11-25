import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

function pageWindow(current: number, total: number, size = 5): number[] {
  const half = Math.floor(size / 2)
  const start = Math.max(1, Math.min(current - half, total - size + 1))
  const end = Math.min(total, start + size - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const boxClass =
  'inline-flex size-9 items-center justify-center rounded-input text-sm transition-colors'

function PageLink({
  to,
  totalPages,
  label,
  onNavigate,
  children,
}: {
  to: number
  totalPages: number
  label: string
  onNavigate: () => void
  children: ReactNode
}) {
  if (to < 1 || to > totalPages) {
    return (
      <span
        aria-disabled
        className={cn(boxClass, 'text-text-muted opacity-40')}
      >
        {children}
        <span className="sr-only">{label}</span>
      </span>
    )
  }
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, page: to })}
      resetScroll={false}
      // Sem exact, o Router marca como ativo qualquer link cuja busca
      // esteja contida na URL atual, e todos ganham aria-current.
      activeOptions={{ exact: true }}
      onClick={onNavigate}
      aria-label={label}
      className={cn(boxClass, 'bg-surface hover:bg-surface-raised')}
    >
      {children}
    </Link>
  )
}

export function Pagination({
  page,
  totalPages,
  onNavigate,
}: {
  page: number
  totalPages: number
  onNavigate: () => void
}) {
  if (totalPages <= 1) return null
  const common = { totalPages, onNavigate }

  return (
    <nav aria-label="Paginação" className="mt-12 flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <PageLink to={page - 1} label="Página anterior" {...common}>
            <ChevronLeft className="size-4" aria-hidden />
          </PageLink>
        </li>
        {pageWindow(page, totalPages).map((n) => (
          <li key={n}>
            {n === page ? (
              <span
                aria-current="page"
                className={cn(boxClass, 'bg-primary font-bold text-ink')}
              >
                <span className="sr-only">Página </span>
                {n}
              </span>
            ) : (
              <PageLink to={n} label={`Página ${n}`} {...common}>
                {n}
              </PageLink>
            )}
          </li>
        ))}
        <li>
          <PageLink to={page + 1} label="Próxima página" {...common}>
            <ChevronRight className="size-4" aria-hidden />
          </PageLink>
        </li>
      </ul>
    </nav>
  )
}
