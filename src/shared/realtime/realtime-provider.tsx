import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { useSession } from '@/features/auth/queries'
import { applyNftToCart } from '@/features/cart/realtime'
import { applyNftUpdated } from '@/features/catalog/realtime'
import { applyOrderUpdated } from '@/features/checkout/realtime'
import { sessionToken } from '@/shared/api/session-token'
import { createEventGate } from './event-gate'
import {
  createSocket,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from './socket'

// Conecta o socket.io-client e aplica os eventos no cache do TanStack Query.
// Os eventos chegam SÓ por aqui: nenhum componente simula evento direto.
//
// Um socket por sessão: quando o usuário entra, sai ou troca, o efeito
// desconecta o socket antigo e abre outro. Eventos da sessão anterior
// não chegam mais e o porteiro de eventos começa vazio.
export function RealtimeProvider() {
  const queryClient = useQueryClient()
  const { user, isPending } = useSession()
  const userId = user?.id ?? null

  useEffect(() => {
    // Espera saber quem está logado antes de conectar.
    if (isPending) return

    let socket: Socket | null = null
    let cancelled = false
    let connectedBefore = false
    // Contador de eventos recebidos (aceitos ou ignorados). Os testes E2E
    // esperam ele subir para saber que o evento já foi processado.
    let received = 0
    const accept = createEventGate()
    const root = document.documentElement

    function onConnect() {
      root.dataset.realtime = 'connected'
      const token = sessionToken.get()
      if (userId && token) socket?.emit('session.join', token)
      // Reconexão: eventos podem ter se perdido enquanto a conexão estava
      // caída. Busca de novo, no REST, tudo que está na tela.
      if (connectedBefore) queryClient.invalidateQueries()
      connectedBefore = true
    }

    function onDisconnect() {
      root.dataset.realtime = 'disconnected'
    }

    function countReceived() {
      received += 1
      root.dataset.realtimeReceived = String(received)
    }

    function onNftUpdated(event: NftUpdatedEvent) {
      countReceived()
      if (!accept(event)) return
      applyNftToCart(queryClient, event)
      applyNftUpdated(queryClient, event)
    }

    function onOrderUpdated(event: OrderUpdatedEvent) {
      countReceived()
      if (!userId || !accept(event)) return
      applyOrderUpdated(queryClient, userId, event)
    }

    createSocket().then((created) => {
      if (cancelled) return
      socket = created
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('nft.updated', onNftUpdated)
      socket.on('order.updated', onOrderUpdated)
      socket.connect()
    })

    return () => {
      cancelled = true
      socket?.off('connect', onConnect)
      socket?.off('disconnect', onDisconnect)
      socket?.off('nft.updated', onNftUpdated)
      socket?.off('order.updated', onOrderUpdated)
      socket?.disconnect()
      onDisconnect()
    }
  }, [queryClient, userId, isPending])

  return null
}
