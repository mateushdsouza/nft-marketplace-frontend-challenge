import { queryOptions } from '@tanstack/react-query'
import { userKeys } from '@/features/auth/queries'
import { api } from '@/shared/api/client'
import type { CreateOrderRequest, Order } from '@/shared/api/types'

// A mesma chave em todas as tentativas de envio do mesmo pedido:
// se a resposta se perder e o usuário tentar de novo, a API devolve
// o pedido que já existe em vez de criar outro.
export async function createOrder(
  body: CreateOrderRequest,
  idempotencyKey: string,
) {
  const { data } = await api.post<Order>('/orders', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function fetchOrder(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Order>(`/orders/${encodeURIComponent(id)}`, {
    signal,
  })
  return data
}

export function orderQuery(userId: string, orderId: string) {
  return queryOptions({
    queryKey: [...userKeys.all(userId), 'order', orderId],
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    // O resultado chega pelo socket (order.updated). Enquanto pendente,
    // uma consulta a cada 15 s cobre o caso de o socket estar fora do ar.
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 15_000 : false,
  })
}
