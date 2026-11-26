import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft } from '@/shared/api/types'
import { randomHex } from './auth'

// Servidor Socket.IO falso. O socket.io-client do app abre um WebSocket de
// verdade para /socket.io/; o MSW intercepta e o binding traduz o protocolo.
// O MSW remove o "/socket.io/" do caminho antes de comparar, por isso o link
// é a raiz da origem.
const realtime = ws.link(window.location.origin.replace(/^http/, 'ws'))

type SocketConnection = ReturnType<typeof toSocketIo>
const connections = new Set<SocketConnection>()

// O Engine.IO espera um "ping" do servidor a cada pingInterval (25 s).
// O binding não envia, então o mock envia, senão o cliente cairia a cada 30 s.
const PING_MS = 20_000

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    // A raiz também recebe o WebSocket do hot reload do Vite: esse segue
    // para o servidor de verdade.
    if (!connection.client.url.pathname.startsWith('/socket.io/')) {
      connection.server.connect()
      return
    }
    const io = toSocketIo(connection)
    connections.add(io)
    const ping = setInterval(() => connection.client.send('2'), PING_MS)
    connection.client.addEventListener('close', () => {
      connections.delete(io)
      clearInterval(ping)
    })
  }),
]

function broadcast(event: string, payload: unknown) {
  connections.forEach((io) => io.client.emit(event, payload))
}

export function emitNftUpdated(nft: Nft) {
  broadcast('nft.updated', {
    eventId: `evt_${randomHex(8)}`,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    data: {
      priceEth: nft.priceEth,
      previousPriceEth: nft.previousPriceEth,
      editions: nft.editions,
    },
  })
}
