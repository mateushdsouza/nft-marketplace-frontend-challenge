import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query'
import { sessionKey, useSession } from '@/features/auth/queries'
import { guestCart, useGuestCartId } from '@/shared/api/guest-cart'
import type { Cart, Network, Session } from '@/shared/api/types'
import { fetchCart, fetchQuote } from './api'

// O carrinho pertence ao usuário logado ou ao visitante.
// A chave do cache carrega o dono: um nunca lê o carrinho do outro.
export function cartOwnerKey(userId: string | null, guestId: string | null) {
  return userId
    ? (['user', userId] as const)
    : (['guest', guestId ?? 'none'] as const)
}

export function cartKey(userId: string | null, guestId: string | null) {
  return [...cartOwnerKey(userId, guestId), 'cart'] as const
}

// Para mutations: lê o dono no momento da resposta (o id do visitante
// pode ter sido criado durante a própria requisição).
export function currentCartKey(queryClient: QueryClient) {
  const session = queryClient.getQueryData<Session | null>(sessionKey)
  return cartKey(session?.user.id ?? null, guestCart.get())
}

export function cartQuery(userId: string | null, guestId: string | null) {
  return queryOptions({
    queryKey: cartKey(userId, guestId),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 10_000,
  })
}

export function useCart() {
  const { user, isPending } = useSession()
  const guestId = useGuestCartId()
  return useQuery({
    ...cartQuery(user?.id ?? null, guestId),
    enabled: !isPending,
  })
}

// Itens cuja quantidade passou do estoque atual (o estoque pode mudar
// depois que o item entrou no carrinho).
export function stockIssues(cart: Cart | undefined) {
  return (cart?.items ?? []).filter((i) => i.quantity > i.edition.available)
}

export function useCartQuote(cart: Cart | undefined, network: Network) {
  const { user } = useSession()
  const guestId = useGuestCartId()
  const items = (cart?.items ?? []).map((i) => ({
    nftId: i.nftId,
    editionId: i.editionId,
    quantity: i.quantity,
  }))
  // Preço e versão entram na chave: se o NFT mudar, a cotação é refeita.
  const fingerprint = (cart?.items ?? []).map(
    (i) => `${i.id}:${i.quantity}:${i.nft.priceEth}:${i.nft.version}`,
  )
  const couponCode = cart?.couponCode ?? undefined

  return useQuery({
    queryKey: [
      ...cartOwnerKey(user?.id ?? null, guestId),
      'quote',
      { fingerprint, couponCode, network },
    ],
    queryFn: ({ signal }) => fetchQuote({ items, couponCode, network }, signal),
    enabled: items.length > 0 && stockIssues(cart).length === 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}
