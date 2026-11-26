import type { QueryClient } from '@tanstack/react-query'
import type { Nft, NftListResponse } from '@/shared/api/types'
import type { NftUpdatedEvent } from '@/shared/realtime/socket'
import { nftKeys } from './queries'

// Junta o evento ao NFT do cache. Versão igual ou menor não muda nada:
// o cache pode já ter vindo do REST mais novo que o evento.
export function mergeNft<T extends Nft>(nft: T, event: NftUpdatedEvent): T {
  if (event.version <= nft.version) return nft
  return { ...nft, ...event.data, version: event.version }
}

// nft.updated no catálogo: atualiza o detalhe e todas as listas em cache
// (página atual, outras páginas, destaques, relacionados), sem nova requisição.
export function applyNftUpdated(
  queryClient: QueryClient,
  event: NftUpdatedEvent,
) {
  queryClient.setQueryData<Nft>(nftKeys.detail(event.resource.id), (old) =>
    old ? mergeNft(old, event) : old,
  )

  queryClient.setQueriesData<NftListResponse>(
    { queryKey: nftKeys.lists() },
    (old) =>
      old && {
        ...old,
        items: old.items.map((item) =>
          item.id === event.resource.id ? mergeNft(item, event) : item,
        ),
      },
  )
}
