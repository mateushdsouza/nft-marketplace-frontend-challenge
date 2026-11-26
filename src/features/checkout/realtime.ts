import type { QueryClient } from '@tanstack/react-query'
import { userKeys } from '@/features/auth/queries'
import type { Order } from '@/shared/api/types'
import type { OrderUpdatedEvent } from '@/shared/realtime/socket'
import { orderQuery } from './api'

// order.updated: troca o pedido do cache pelo que veio no evento, se for
// mais novo. A chave leva o id do usuário da sessão atual.
export function applyOrderUpdated(
  queryClient: QueryClient,
  userId: string,
  event: OrderUpdatedEvent,
) {
  queryClient.setQueryData<Order>(
    orderQuery(userId, event.resource.id).queryKey,
    (old) => (old && event.version > old.version ? event.data : old),
  )
  // Pedido confirmado tira os itens comprados do carrinho na API. O
  // carrinho do cache fica marcado como velho até chegar o novo.
  if (event.data.status === 'confirmed') {
    queryClient.invalidateQueries({
      queryKey: [...userKeys.all(userId), 'cart'],
    })
  }
}
