import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart } from '@/shared/api/types'
import { EDITION_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import type { NftUpdatedEvent } from '@/shared/realtime/socket'
import { currentCartKey } from './queries'

// O que mudou para quem tem esse NFT no carrinho, em texto para o aviso.
export function cartChanges(cart: Cart, event: NftUpdatedEvent): string[] {
  const lines = cart.items.filter((i) => i.nftId === event.resource.id)
  if (lines.length === 0 || event.version <= lines[0].nft.version) return []

  const { name, priceEth } = lines[0].nft
  const changes: string[] = []
  if (event.data.priceEth !== priceEth) {
    changes.push(
      `O preço de ${name} mudou de ${formatEth(priceEth)} para ${formatEth(event.data.priceEth)}.`,
    )
  }
  for (const line of lines) {
    const edition = event.data.editions.find((e) => e.id === line.editionId)
    if (edition && edition.available < line.quantity) {
      changes.push(
        edition.available === 0
          ? `${name} (${EDITION_LABEL[edition.kind]}) esgotou.`
          : `${name} (${EDITION_LABEL[edition.kind]}) tem só ${edition.available} disponíveis.`,
      )
    }
  }
  return changes
}

// Avisa e busca o carrinho de novo: os valores e a cotação vêm da API.
export function applyNftToCart(
  queryClient: QueryClient,
  event: NftUpdatedEvent,
) {
  const key = currentCartKey(queryClient)
  const cart = queryClient.getQueryData<Cart>(key)
  if (!cart) return
  // Carrinho já sendo buscado de novo (por exemplo, logo depois de uma
  // compra): os itens do cache podem nem existir mais. Não avisa nada; o
  // carrinho novo vem da API com os valores atuais.
  if (queryClient.getQueryState(key)?.isInvalidated) return
  const changes = cartChanges(cart, event)
  if (changes.length === 0) return
  toast.warning(changes.join(' '), { duration: 10_000 })
  queryClient.invalidateQueries({ queryKey: key })
}
