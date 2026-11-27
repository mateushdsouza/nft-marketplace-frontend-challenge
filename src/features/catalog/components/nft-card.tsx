import { Link } from '@tanstack/react-router'
import type { Nft } from '@/shared/api/types'
import { formatEth } from '@/shared/lib/money'
import { Skeleton } from '@/shared/ui/skeleton'
import { artSrcSet } from '@/shared/lib/images'

// priority: card da primeira linha, visível sem rolar. A imagem dele costuma
// ser o LCP, então carrega na hora e com prioridade alta (sem lazy).
export function NftCard({
  nft,
  priority = false,
}: {
  nft: Nft
  priority?: boolean
}) {
  return (
    <article>
      <Link
        to="/nft/$id"
        params={{ id: nft.id }}
        className="group block rounded-card focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <div className="flex aspect-[258/300] items-center justify-center rounded-card bg-surface p-1 max-md:aspect-[175/200] max-md:rounded-[20px] max-md:bg-gradient-to-b max-md:from-surface max-md:to-surface-raised">
          <img
            src={nft.image}
            srcSet={artSrcSet(nft.image)}
            sizes="(max-width: 767px) 45vw, 250px"
            alt={`Arte do NFT ${nft.name}`}
            width={250}
            height={250}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="aspect-square w-full rounded-art object-cover max-md:rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        </div>
        <h3 className="mt-2 truncate text-[15px] leading-5 max-md:px-2 md:mt-3 md:text-base">
          {nft.name}
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 max-md:px-2 md:mt-1">
          <span className="text-base font-bold text-text-accent md:text-lg">
            {formatEth(nft.priceEth)}
          </span>
          {nft.previousPriceEth && (
            <span className="text-sm text-secondary">
              <span className="sr-only">Preço anterior: </span>
              <s>{formatEth(nft.previousPriceEth)}</s>
            </span>
          )}
        </p>
      </Link>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[258/300] rounded-card max-md:aspect-[175/200] max-md:rounded-[20px]" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-1 h-6 w-1/3" />
    </div>
  )
}
