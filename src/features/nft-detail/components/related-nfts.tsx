import { NftShelf } from '@/features/catalog/components/nft-shelf'
import type { Nft } from '@/shared/api/types'

export function RelatedNfts({ nft }: { nft: Nft }) {
  return (
    <NftShelf
      id="relacionados"
      title="Mais desta coleção"
      params={{ collection: nft.collection, sort: 'recent' }}
      excludeIds={[nft.id]}
    />
  )
}
