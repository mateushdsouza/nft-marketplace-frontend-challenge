import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft } from '@/shared/api/types'
import { randomHex } from './auth'
import { db } from './db'
import { onOrderChange, toPublicOrder } from './orders'

// Servidor Socket.IO falso. O socket.io-client do app abre um WebSocket de
// verdade para /socket.io/; o MSW intercepta e o binding traduz o protocolo.
// O MSW remove o "/socket.io/" do caminho antes de comparar, por isso o link
// é a raiz da origem.
const realtime = ws.link(window.location.origin.replace(/^http/, 'ws'))

type SocketIo = ReturnType<typeof toSocketIo>

interface Client {
  io: SocketIo
  close: () => void
  // Dono da conexão, definido pelo evento "session.join".
  userId: string | null
}

interface EventPayload {
  eventId: string
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  data: unknown
}

const clients = new Set<Client>()

// O Engine.IO espera um "ping" do servidor a cada pingInterval (25 s).
// O binding não envia, então o mock envia, senão o cliente cairia a cada 30 s.
const PING_MS = 20_000

// Enquanto "offline", o servidor derruba as conexões e recusa novas.
let offline = false

// Últimos eventos de NFT enviados, para os testes repetirem.
const history: Array<{ name: string; payload: EventPayload }> = []

function userIdFromToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const session = db.state.sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  return session.userId
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    // A raiz também recebe o WebSocket do hot reload do Vite: esse segue
    // para o servidor de verdade.
    if (!connection.client.url.pathname.startsWith('/socket.io/')) {
      connection.server.connect()
      return
    }
    if (offline) {
      connection.client.close()
      return
    }
    const client: Client = {
      io: toSocketIo(connection),
      close: () => connection.client.close(),
      userId: null,
    }
    clients.add(client)

    // O cliente informa o token depois de conectar. Sem token válido, a
    // conexão recebe só eventos públicos (catálogo).
    client.io.client.on('session.join', (_event, token) => {
      client.userId = userIdFromToken(token)
    })

    const ping = setInterval(() => connection.client.send('2'), PING_MS)
    connection.client.addEventListener('close', () => {
      clients.delete(client)
      clearInterval(ping)
    })
  }),
]

function send(name: string, payload: EventPayload, userId?: string) {
  clients.forEach((client) => {
    if (userId && client.userId !== userId) return
    client.io.client.emit(name, payload)
  })
}

export function emitNftUpdated(nft: Nft) {
  const payload: EventPayload = {
    eventId: `evt_${randomHex(8)}`,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    data: {
      priceEth: nft.priceEth,
      previousPriceEth: nft.previousPriceEth,
      editions: nft.editions,
    },
  }
  history.push({ name: 'nft.updated', payload })
  if (history.length > 20) history.shift()
  send('nft.updated', payload)
}

// Pedido mudou: avisa só o dono. Se confirmou, o estoque dos NFTs mudou.
onOrderChange((order) => {
  send(
    'order.updated',
    {
      eventId: `evt_${randomHex(8)}`,
      resource: { type: 'order', id: order.id },
      version: order.version,
      data: toPublicOrder(order),
    },
    order.userId,
  )
  if (order.status !== 'confirmed') return
  for (const line of order.items) {
    const nft = db.state.nfts.find((n) => n.id === line.nftId)
    if (nft) emitNftUpdated(nft)
  }
})

// Controles usados pelos testes (via /api/__realtime/...).
export const realtimeControl = {
  // Reenvia o último evento como veio (duplicado).
  replayLast() {
    const last = history.at(-1)
    if (!last) return false
    send(last.name, last.payload)
    return true
  },
  // Reenvia o penúltimo evento com id novo: versão antiga chegando atrasada.
  replayStale() {
    const stale = history.at(-2)
    if (!stale) return false
    send(stale.name, { ...stale.payload, eventId: `evt_${randomHex(8)}` })
    return true
  },
  setOffline(value: boolean) {
    offline = value
    if (value) clients.forEach((client) => client.close())
  },
  reset() {
    offline = false
    history.length = 0
  },
}
