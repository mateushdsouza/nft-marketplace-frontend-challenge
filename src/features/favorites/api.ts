import { useQuery } from '@tanstack/react-query'
import { useSession, userKeys } from '@/features/auth/queries'
import { api } from '@/shared/api/client'
import type { FavoritesResponse } from '@/shared/api/types'

export async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await api.get<FavoritesResponse>('/favorites', { signal })
  return data
}

export async function addFavorite(nftId: string) {
  const { data } = await api.put<FavoritesResponse>(`/favorites/${nftId}`)
  return data
}

export async function removeFavorite(nftId: string) {
  const { data } = await api.delete<FavoritesResponse>(`/favorites/${nftId}`)
  return data
}

export function favoritesKey(userId: string) {
  return [...userKeys.all(userId), 'favorites'] as const
}

export function useFavorites() {
  const { user } = useSession()
  return useQuery({
    queryKey: favoritesKey(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: !!user,
  })
}
