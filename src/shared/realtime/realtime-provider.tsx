import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { nftKeys } from '@/features/catalog/queries'
import type { Nft } from '@/shared/api/types'
import { createSocket, type NftUpdatedEvent } from './socket'

// Conecta o socket.io-client e aplica os eventos no cache do TanStack Query.
// Os eventos chegam SÓ por aqui: nenhum componente simula evento direto.
export function RealtimeProvider() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false
    const seen = new Set<string>()

    function onNftUpdated(event: NftUpdatedEvent) {
      if (seen.has(event.eventId)) return
      seen.add(event.eventId)
      queryClient.setQueryData<Nft>(nftKeys.detail(event.resource.id), (old) =>
        old && event.version > old.version
          ? { ...old, ...event.data, version: event.version }
          : old,
      )
    }

    createSocket().then((created) => {
      if (cancelled) return
      socket = created
      socket.on('connect', () => {
        document.documentElement.dataset.realtime = 'connected'
      })
      socket.on('disconnect', () => {
        document.documentElement.dataset.realtime = 'disconnected'
      })
      socket.on('nft.updated', onNftUpdated)
      socket.connect()
    })

    return () => {
      cancelled = true
      socket?.off('nft.updated', onNftUpdated)
      socket?.disconnect()
    }
  }, [queryClient])

  return null
}
