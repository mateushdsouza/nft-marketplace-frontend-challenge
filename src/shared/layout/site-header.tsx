import { Link } from '@tanstack/react-router'
import { LogIn, LogOut, Search, ShoppingCart } from 'lucide-react'
import { useLogout } from '@/features/auth/mutations'
import { useSession } from '@/features/auth/queries'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { comingSoon } from '@/shared/lib/coming-soon'
import { Button } from '@/shared/ui/button'
import { UserAvatar } from '@/shared/ui/user-avatar'

const navLinkClass =
  'relative py-3 text-base text-foreground transition-colors hover:text-text-accent'

export function SiteHeader() {
  const { user, isPending } = useSession()
  const logout = useLogout()

  return (
    <header className="border-b border-primary/30">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-6">
        <Link
          to="/"
          className="text-sm font-bold tracking-[0.1em] text-foreground"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-10">
            <li>
              <Link
                to="/"
                activeOptions={{ exact: true, includeSearch: false }}
                className={navLinkClass}
                activeProps={{
                  className:
                    'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-[11px] after:h-[3px] after:bg-primary',
                  'aria-current': 'page',
                }}
              >
                Início
              </Link>
            </li>
            <li>
              <Link to="/" hash="catalogo" className={navLinkClass}>
                Mercado
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={navLinkClass}
                onClick={() => comingSoon('A página de criadores')}
              >
                Criadores
              </button>
            </li>
            <li>
              <button
                type="button"
                className={navLinkClass}
                onClick={() => comingSoon('A área Aprenda')}
              >
                Aprenda
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            hash="catalogo"
            className="hidden rounded-button p-1 text-foreground hover:text-text-accent md:inline-flex"
            aria-label="Buscar NFTs"
          >
            <Search className="size-5" aria-hidden />
          </Link>
          <Link
            to="/carrinho"
            className="relative hidden rounded-button p-1 text-foreground hover:text-text-accent md:inline-flex"
          >
            <ShoppingCart className="size-5" aria-hidden />
            <CartCountBadge />
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/perfil"
                className="flex items-center gap-2 text-sm hover:text-text-accent"
              >
                <UserAvatar name={user.displayName} src={user.avatarUrl} />
                <span className="hidden max-w-32 truncate lg:inline">
                  {user.displayName}
                </span>
                <span className="sr-only lg:hidden">Meu perfil</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="rounded-button"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                <LogOut aria-hidden />
                Sair
              </Button>
            </div>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-button"
              aria-disabled={isPending || undefined}
            >
              <Link to="/entrar">
                <LogIn aria-hidden />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
