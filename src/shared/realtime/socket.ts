import type { Socket } from 'socket.io-client'
import type { EthAmount, NftEdition } from '@/shared/api/types'

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

// Import dinâmico de propósito: o engine.io-client guarda uma referência ao
// WebSocket global quando o módulo carrega. Carregando depois do MSW iniciar,
// ele usa o WebSocket que o MSW intercepta. Sem mocks, não muda nada.
export async function createSocket(): Promise<Socket> {
  const { io } = await import('socket.io-client')
  return io(window.location.origin, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
  })
}
