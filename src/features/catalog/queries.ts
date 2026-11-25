import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListParams } from '@/shared/api/types'
import { fetchNft, fetchNfts } from './api'

// Cada combinação de filtros é uma entrada própria no cache.
// Uma resposta antiga nunca sobrescreve a atual: ela é gravada
// na chave dela, e a tela só lê a chave dos parâmetros atuais.
export const nftKeys = {
  all: ['nfts'] as const,
  lists: () => [...nftKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...nftKeys.lists(), params] as const,
  details: () => [...nftKeys.all, 'detail'] as const,
  detail: (id: string) => [...nftKeys.details(), id] as const,
}

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: nftKeys.list(params),
    // O signal cancela a requisição quando os filtros mudam antes da resposta.
    queryFn: ({ signal }) => fetchNfts(params, signal),
    // Mantém a página anterior na tela enquanto a nova carrega.
    placeholderData: keepPreviousData,
  })
}

export function nftDetailQuery(id: string) {
  return queryOptions({
    queryKey: nftKeys.detail(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
  })
}
