import { useMutation, useQueryClient } from '@tanstack/react-query'
import { guestCart } from '@/shared/api/guest-cart'
import { sessionToken } from '@/shared/api/session-token'
import type { Cart, CartItemInput } from '@/shared/api/types'
import {
  addCartItem,
  applyCoupon,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from './api'
import { currentCartKey } from './queries'

// Toda mutation do carrinho devolve o carrinho atualizado pela API.
// Gravamos essa resposta no cache: a tela mostra exatamente o que a API calculou.
function useCartMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Cart>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (cart) => {
      const key = currentCartKey(queryClient)
      // Um GET /cart que saiu antes desta mutation pode responder depois
      // com o carrinho antigo. Cancelamos antes de gravar a resposta nova.
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData(key, cart)
    },
  })
}

export function useAddToCart() {
  return useCartMutation((input: CartItemInput) => {
    // Visitante ganha um id de carrinho na primeira inclusão.
    if (!sessionToken.get()) guestCart.ensure()
    return addCartItem(input)
  })
}

export function useUpdateCartItem() {
  return useCartMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
  )
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) => removeCartItem(itemId))
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => applyCoupon(code))
}

export function useRemoveCoupon() {
  return useCartMutation(() => removeCoupon())
}
