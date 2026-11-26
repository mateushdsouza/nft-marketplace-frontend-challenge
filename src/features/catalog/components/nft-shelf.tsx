import { useQuery } from '@tanstack/react-query'
import type { NftListParams } from '@/shared/api/types'
import { nftListQuery } from '../queries'
import { NftCard, NftCardSkeleton } from './nft-card'

// Vitrine de até 5 NFTs vindos da API ("Mais desta coleção" no detalhe,
// "Colecionadores também viram" no carrinho). Sem resultado ou com erro, some:
// é conteúdo complementar e não deve atrapalhar a tela principal.
export function NftShelf({
  id,
  title,
  params,
  excludeIds = [],
}: {
  id: string
  title: string
  params: NftListParams
  excludeIds?: string[]
}) {
  const { data, isPending, isError } = useQuery(
    nftListQuery({ ...params, pageSize: 5 + excludeIds.length }),
  )
  const items = data?.items
    .filter((item) => !excludeIds.includes(item.id))
    .slice(0, 5)

  if (isError || (items && items.length === 0)) return null

  return (
    <section aria-labelledby={id} className="mt-20">
      <h2
        id={id}
        className="border-b border-border pb-3 text-base font-bold text-text-accent"
      >
        {title}
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
