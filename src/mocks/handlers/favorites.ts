import { http, HttpResponse } from 'msw'
import type { FavoritesResponse } from '@/shared/api/types'
import { authenticate } from '../auth'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'
import { scenario } from '../scenarios'

function favoritesOf(userId: string): string[] {
  db.state.favorites[userId] ??= []
  return db.state.favorites[userId]
}

function respond(userId: string) {
  const body: FavoritesResponse = { nftIds: [...favoritesOf(userId)] }
  return HttpResponse.json(body)
}

// No cenário "favorite-error" a API de favoritos fica fora do ar, depois de
// um tempo: a tela mostra a mudança otimista e depois o rollback. A leitura
// também falha, então só o rollback consegue desfazer o clique.
async function favoritesFailure() {
  if (scenario.name !== 'favorite-error') return null
  await new Promise((resolve) => setTimeout(resolve, 800))
  return apiError(
    503,
    'SERVICE_UNAVAILABLE',
    'Favoritos indisponíveis no momento.',
  )
}

export const favoriteHandlers = [
  http.get(
    `${API}/favorites`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const failure = await favoritesFailure()
      if (failure) return failure
      return respond(auth.user.id)
    }),
  ),

  http.put(
    `${API}/favorites/:nftId`,
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const nftId = String(params.nftId)
      if (!db.state.nfts.some((nft) => nft.id === nftId)) {
        return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      }
      const failure = await favoritesFailure()
      if (failure) return failure

      const list = favoritesOf(auth.user.id)
      if (!list.includes(nftId)) {
        list.push(nftId)
        db.commit()
      }
      return respond(auth.user.id)
    }),
  ),

  http.delete(
    `${API}/favorites/:nftId`,
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const failure = await favoritesFailure()
      if (failure) return failure

      const nftId = String(params.nftId)
      db.state.favorites[auth.user.id] = favoritesOf(auth.user.id).filter(
        (id) => id !== nftId,
      )
      db.commit()
      return respond(auth.user.id)
    }),
  ),
]
