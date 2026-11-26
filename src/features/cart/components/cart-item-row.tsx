import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CartItem } from '@/shared/api/types'
import { EDITION_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  useAddToCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../mutations'
import { artSrcSet } from '@/shared/lib/images'

export const cartGridClass =
  'md:grid md:grid-cols-[minmax(0,1fr)_110px_130px_120px_40px] md:items-center md:gap-4'

export function CartItemRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const add = useAddToCart()
  const busy = update.isPending || remove.isPending
  const available = item.edition.available
  const overStock = item.quantity > available

  function changeQuantity(quantity: number) {
    update.mutate(
      { itemId: item.id, quantity },
      { onError: (error) => toast.error(error.message) },
    )
  }

  return (
    <li
      aria-busy={busy || undefined}
      className={cn(
        'relative grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-card bg-surface p-3 md:rounded-none md:bg-ink-soft md:p-0 md:pr-4',
        cartGridClass,
        busy && 'opacity-70',
      )}
    >
      <div className="row-span-3 flex items-center gap-4 md:row-span-1">
        <img
          src={item.nft.image}
          srcSet={artSrcSet(item.nft.image)}
          sizes="80px"
          alt=""
          width={70}
          height={70}
          loading="lazy"
          className="size-[72px] shrink-0 rounded-input object-cover md:size-[70px]"
        />
        <div className="hidden min-w-0 md:block">
          <ItemTitle item={item} />
        </div>
      </div>

      <div className="min-w-0 md:hidden">
        <ItemTitle item={item} />
      </div>

      <p className="text-sm md:text-base">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.nft.priceEth)}
      </p>

      <div className="flex items-center justify-between gap-3 md:block">
        <QuantityStepper
          value={item.quantity}
          max={Math.max(available, item.quantity)}
          onChange={changeQuantity}
          disabled={busy}
          label={`Quantidade de ${item.nft.name}`}
          className="gap-2"
        />
        <p className="font-bold text-text-accent md:hidden">
          {formatEth(item.lineTotalEth)}
        </p>
      </div>

      <p className="hidden font-bold text-text-accent md:block">
        <span className="sr-only">Total do item: </span>
        {formatEth(item.lineTotalEth)}
      </p>

      <button
        type="button"
        onClick={() =>
          remove.mutate(item.id, {
            // Remover é imediato; o aviso oferece desfazer (adiciona de novo
            // a mesma edição e quantidade, sujeito ao estoque atual).
            onSuccess: () =>
              toast.success(`${item.nft.name} removido.`, {
                action: {
                  label: 'Desfazer',
                  onClick: () =>
                    add.mutate(
                      {
                        nftId: item.nftId,
                        editionId: item.editionId,
                        quantity: item.quantity,
                      },
                      { onError: (error) => toast.error(error.message) },
                    ),
                },
              }),
            onError: (error) => toast.error(error.message),
          })
        }
        disabled={busy}
        aria-label={`Remover ${item.nft.name} do carrinho`}
        className="absolute top-3 right-3 rounded-button p-1 text-text-secondary hover:text-coral disabled:opacity-50 md:static"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>

      {(overStock || item.quantity === available) && (
        <p
          role={overStock ? 'alert' : undefined}
          className={cn(
            'col-span-2 text-xs md:col-span-5 md:px-3 md:pb-3',
            overStock ? 'text-coral' : 'text-text-muted',
          )}
        >
          {overStock
            ? available === 0
              ? 'Esta edição esgotou. Remova o item para continuar.'
              : `Só restam ${available} nesta edição. Ajuste a quantidade para continuar.`
            : 'Você já tem todas as unidades disponíveis desta edição.'}
        </p>
      )}
    </li>
  )
}

function ItemTitle({ item }: { item: CartItem }) {
  return (
    <>
      <Link
        to="/nft/$id"
        params={{ id: item.nftId }}
        className="block truncate pr-8 font-bold hover:text-text-accent md:pr-0"
      >
        {item.nft.name}
      </Link>
      <p className="text-xs text-text-secondary">
        Edição: {EDITION_LABEL[item.edition.kind]} · ID do token:{' '}
        {item.nft.tokenId}
      </p>
    </>
  )
}

export function CartItemSkeleton() {
  return (
    <li
      className={cn(
        'grid grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-card bg-surface p-3 md:rounded-none md:bg-ink-soft md:p-0',
        cartGridClass,
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-[72px] rounded-input md:size-[70px]" />
        <div className="hidden flex-1 space-y-2 md:block">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="hidden h-8 w-24 md:block" />
      <Skeleton className="hidden h-5 w-20 md:block" />
      <Skeleton className="hidden size-6 md:block" />
    </li>
  )
}
