import type { Network, Order, Quote } from '@/shared/api/types'
import { randomHex } from './auth'
import { db, type OrderRecord } from './db'

// Tempo que a "rede" leva para confirmar ou recusar um pedido.
export const ORDER_PROCESSING_MS = 2000

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

// Respostas que o cenário "order-timeout" já derrubou uma vez.
export const droppedResponses = new Set<string>()

// Listeners de mudança de pedido (usados pelo servidor Socket.IO do mock).
const orderListeners = new Set<(order: OrderRecord) => void>()
export function onOrderChange(listener: (order: OrderRecord) => void) {
  orderListeners.add(listener)
  return () => orderListeners.delete(listener)
}

// Remove os campos internos antes de responder.
export function toPublicOrder(order: OrderRecord): Order {
  const {
    userId: _userId,
    idempotencyKey: _key,
    requestHash: _hash,
    outcome: _outcome,
    settleAt: _settleAt,
    ...publicOrder
  } = order
  void [_userId, _key, _hash, _outcome, _settleAt]
  return publicOrder
}

export function sameQuote(a: Quote, b: Quote) {
  if (a.totalEth !== b.totalEth) return false
  if (a.discountEth !== b.discountEth) return false
  if (a.networkFeeEth !== b.networkFeeEth) return false
  if (a.items.length !== b.items.length) return false
  return a.items.every((line, i) => {
    const other = b.items[i]
    return (
      line.nftId === other.nftId &&
      line.editionId === other.editionId &&
      line.quantity === other.quantity &&
      line.unitPriceEth === other.unitPriceEth
    )
  })
}

function confirm(order: OrderRecord) {
  // Revalida o estoque no momento da liquidação.
  for (const line of order.items) {
    const nft = db.state.nfts.find((n) => n.id === line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition || edition.available < line.quantity) {
      reject(order, 'A edição esgotou antes da confirmação.')
      return
    }
  }
  for (const line of order.items) {
    const nft = db.state.nfts.find((n) => n.id === line.nftId)!
    const edition = nft.editions.find((e) => e.id === line.editionId)!
    edition.available -= line.quantity
    nft.version += 1
  }
  // Remove do carrinho só o que foi comprado, na quantidade comprada.
  const cart = db.state.carts[order.userId]
  if (cart) {
    for (const line of order.items) {
      const item = cart.items.find(
        (i) => i.nftId === line.nftId && i.editionId === line.editionId,
      )
      if (item) item.quantity -= line.quantity
    }
    cart.items = cart.items.filter((i) => i.quantity > 0)
    if (cart.items.length === 0) cart.couponCode = null
    cart.updatedAt = new Date().toISOString()
  }
  const hash = `0x${randomHex(32)}`
  order.status = 'confirmed'
  order.txHash = hash
  order.explorerUrl = `${EXPLORERS[order.network]}${hash}`
}

function reject(order: OrderRecord, reason: string) {
  order.status = 'rejected'
  order.failureReason = reason
}

// Aplica o resultado se o tempo de processamento já passou.
// Chamado por timer e também ao consultar o pedido, então a recuperação
// funciona mesmo se a página foi recarregada no meio do processamento.
export function settleIfDue(order: OrderRecord) {
  if (order.status !== 'pending' || Date.now() < order.settleAt) return
  if (order.outcome === 'confirmed') confirm(order)
  else reject(order, 'O pagamento foi recusado pela rede.')
  order.updatedAt = new Date().toISOString()
  order.version += 1
  db.commit()
  orderListeners.forEach((listener) => listener(order))
}

export function scheduleSettlement(order: OrderRecord) {
  setTimeout(() => settleIfDue(order), order.settleAt - Date.now() + 50)
}

// Liquida todos os pedidos vencidos (usado ao iniciar o mock após refresh).
export function settleDueOrders() {
  db.state.orders.forEach(settleIfDue)
}
