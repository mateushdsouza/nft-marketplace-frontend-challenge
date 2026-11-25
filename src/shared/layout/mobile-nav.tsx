import { Link } from '@tanstack/react-router'
import { Heart, House, ShoppingCart, User } from 'lucide-react'
import { comingSoon } from '@/shared/lib/coming-soon'

const itemClass =
  'flex flex-1 flex-col items-center gap-1 py-2 text-xs text-text-secondary'

export function MobileNav() {
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink-soft/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        <li className="flex flex-1">
          <Link
            to="/"
            activeOptions={{ exact: true, includeSearch: false }}
            className={itemClass}
            activeProps={{ className: 'text-primary', 'aria-current': 'page' }}
          >
            <House className="size-5" aria-hidden />
            Início
          </Link>
        </li>
        <li className="flex flex-1">
          <button
            type="button"
            className={itemClass}
            onClick={() => comingSoon('A lista de favoritos')}
          >
            <Heart className="size-5" aria-hidden />
            Favoritos
          </button>
        </li>
        <li className="flex flex-1">
          <Link
            to="/carrinho"
            className={itemClass}
            activeProps={{ className: 'text-primary', 'aria-current': 'page' }}
          >
            <ShoppingCart className="size-5" aria-hidden />
            Carrinho
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            to="/perfil"
            className={itemClass}
            activeProps={{ className: 'text-primary', 'aria-current': 'page' }}
          >
            <User className="size-5" aria-hidden />
            Perfil
          </Link>
        </li>
      </ul>
    </nav>
  )
}
