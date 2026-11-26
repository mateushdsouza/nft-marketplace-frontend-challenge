import { useCart } from '../queries'

// Número de itens no carrinho. Também serve de nome acessível do link.
export function CartCountBadge() {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <>
      <span className="sr-only">
        Carrinho
        {count > 0 ? `, ${count} ${count === 1 ? 'item' : 'itens'}` : ''}
      </span>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-ink"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  )
}
