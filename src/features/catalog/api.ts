import { api } from '@/shared/api/client'
import type { Nft, NftListParams, NftListResponse } from '@/shared/api/types'

export async function fetchNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await api.get<NftListResponse>('/nfts', { params, signal })
  return data
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, {
    signal,
  })
  return data
}
