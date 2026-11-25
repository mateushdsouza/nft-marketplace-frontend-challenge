import { useQuery } from '@tanstack/react-query'
import {
  NftCard,
  NftCardSkeleton,
} from '@/features/catalog/components/nft-card'
import { nftListQuery } from '@/features/catalog/queries'
import type { Nft } from '@/shared/api/types'

export function RelatedNfts({ nft }: { nft: Nft }) {
  const { data, isPending, isError } = useQuery(
    nftListQuery({ network: nft.network, sort: 'recent', pageSize: 6 }),
  )
  const items = data?.items.filter((item) => item.id !== nft.id).slice(0, 5)

  if (isError || (items && items.length === 0)) return null

  return (
    <section aria-labelledby="relacionados" className="mt-20">
      <h2
        id="relacionados"
        className="border-b border-border pb-3 text-base font-bold text-text-accent"
      >
        Mais desta rede
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : items?.map((item) => (
              <li key={item.id}>
                <NftCard nft={item} />
              </li>
            ))}
      </ul>
    </section>
  )
}
