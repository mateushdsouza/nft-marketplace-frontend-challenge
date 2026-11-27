import { Link } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'
import { useSession } from '@/features/auth/queries'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { comingSoon } from '@/shared/lib/coming-soon'
import { UserAvatar } from '@/shared/ui/user-avatar'

// Barra do frame mobile do Figma: só ícones (o nome fica para leitores de
// tela) e o botão central elevado.
const itemClass =
  'flex flex-1 items-center justify-center py-5 text-text-secondary transition-colors hover:text-foreground'
const activeProps = {
  className: 'text-primary',
  'aria-current': 'page' as const,
}

export function MobileNav() {
  const { user } = useSession()

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgb(10_6_4/0.45)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center px-4">
        <li className="flex flex-1">
          <Link
            to="/"
            activeOptions={{ exact: true, includeSearch: false }}
            className={itemClass}
            activeProps={activeProps}
          >
            <House className="size-5" aria-hidden />
            <span className="sr-only">Início</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <button
            type="button"
            className={itemClass}
            onClick={() => comingSoon('A lista de favoritos')}
          >
            <Heart className="size-5" aria-hidden />
            <span className="sr-only">Favoritos</span>
          </button>
        </li>
        <li className="flex flex-1 justify-center">
          <button
            type="button"
            className="-mt-12 flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-primary/40 to-primary text-foreground shadow-[0_6px_20px_rgb(10_6_4/0.45)]"
            onClick={() => comingSoon('A leitura de QR code')}
          >
            <ScanLine className="size-7" aria-hidden />
            <span className="sr-only">Ler QR code</span>
          </button>
        </li>
        <li className="flex flex-1">
          <Link to="/carrinho" className={itemClass} activeProps={activeProps}>
            <span className="relative">
              <ShoppingCart className="size-5" aria-hidden />
              <CartCountBadge />
            </span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to="/perfil" className={itemClass} activeProps={activeProps}>
            {user ? (
              <UserAvatar
                name={user.displayName}
                src={user.avatarUrl}
                className="size-6 text-xs"
              />
            ) : (
              <User className="size-5" aria-hidden />
            )}
            <span className="sr-only">
              {user ? `Perfil de ${user.displayName}` : 'Perfil'}
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}
