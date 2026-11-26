import type { Socket } from 'socket.io-client'
import type { EthAmount, NftEdition, Order } from '@/shared/api/types'
import { backendReady } from '@/shared/api/backend-ready'

// Formato de todo evento: id estável, recurso afetado e versão.
export interface RealtimeEvent<TData> {
  eventId: string
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  data: TData
}

export type NftUpdatedEvent = RealtimeEvent<{
  priceEth: EthAmount
  previousPriceEth: EthAmount | null
  editions: NftEdition[]
}>

export type OrderUpdatedEvent = RealtimeEvent<Order>

// Import dinâmico de propósito: o engine.io-client guarda uma referência ao
// WebSocket global quando o módulo carrega. Carregando depois do MSW iniciar,
// ele usa o WebSocket que o MSW intercepta. Sem mocks, não muda nada.
export async function createSocket(): Promise<Socket> {
  await backendReady
  const { io } = await import('socket.io-client')
  return io(window.location.origin, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
    // Tentativa sem resposta em 4 s conta como falha; depois tenta de novo,
    // esperando no máximo 3 s entre tentativas.
    timeout: 4000,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  })
}
