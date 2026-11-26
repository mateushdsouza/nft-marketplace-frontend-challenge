import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/queries'
import type { FavoritesResponse } from '@/shared/api/types'
import { addFavorite, favoritesKey, removeFavorite } from './api'

const toggleKey = ['favorites', 'toggle'] as const

interface ToggleVariables {
  nftId: string
  // estado desejado: true = favoritar, false = desfavoritar
  favorite: boolean
}

// Atualização otimista: o coração muda na hora, antes da resposta da API.
// Se a API falhar, o cache volta ao que era antes do clique.
export function useToggleFavorite(nftName: string) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = favoritesKey(user?.id ?? 'anonymous')

  return useMutation({
    mutationKey: toggleKey,
    mutationFn: ({ nftId, favorite }: ToggleVariables) =>
      favorite ? addFavorite(nftId) : removeFavorite(nftId),

    // Antes da requisição: para buscas em andamento (uma resposta antiga
    // apagaria a mudança), guarda o estado atual e já mostra o novo.
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (old) => {
        const ids = old?.nftIds ?? []
        const next = favorite
          ? ids.includes(nftId)
            ? ids
            : [...ids, nftId]
          : ids.filter((id) => id !== nftId)
        return { ...old, nftIds: next }
      })
      return { previous }
    },

    // A API recusou: volta ao estado de antes do clique e avisa.
    onError: (_error, { favorite }, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(
        favorite
          ? `Não foi possível favoritar ${nftName}. Tente de novo.`
          : `Não foi possível remover ${nftName} dos favoritos. Tente de novo.`,
      )
    },

    // Confere com a API quando a última mutation em andamento termina.
    // Com cliques rápidos, recarregar no meio desfaria os cliques seguintes.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: toggleKey }) === 1) {
        return queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
