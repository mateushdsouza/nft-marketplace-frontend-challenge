import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CartItemRow,
  CartItemSkeleton,
  cartGridClass,
} from '@/features/cart/components/cart-item-row'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { useCart } from '@/features/cart/queries'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const cart = useCart()

  return (
    <main className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <nav aria-label="Trilha" className="mb-4 text-sm font-bold">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>

      {cart.isError && !cart.data ? (
        <StateMessage
          tone="error"
          title="Não foi possível carregar o carrinho"
          description={cart.error.message}
          action={
            <Button className="rounded-button" onClick={() => cart.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : cart.data && cart.data.items.length === 0 ? (
        <StateMessage
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione os NFTs que quiser colecionar."
          action={
            <Button asChild className="rounded-button">
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-20">
          <section aria-label="Itens do carrinho">
            <div
              aria-hidden
              className={cn(
                'hidden border-b border-border pb-3 font-bold',
                cartGridClass,
              )}
            >
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            <ul className="mt-3 space-y-3">
              {cart.data
                ? cart.data.items.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))
                : Array.from({ length: 3 }, (_, i) => (
                    <CartItemSkeleton key={i} />
                  ))}
            </ul>
          </section>

          {cart.data ? (
            <CartSummary cart={cart.data} />
          ) : (
            <div aria-busy="true" className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
