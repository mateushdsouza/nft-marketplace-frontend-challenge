import type { Cart, CartItem, Network, Quote } from '@/shared/api/types'
import { addEth, mulEth, percentOf, subEth } from '@/shared/lib/money'
import { authenticate } from './auth'
import { db, type CartRecord, type QuoteRecord } from './db'
import { NETWORK_FEES, type CouponRecord } from './fixtures/coupons'
import { apiError } from './http'

const GUEST_ID = /^guest_[a-z0-9-]{8,64}$/i
export const QUOTE_TTL_MS = 5 * 60_000

type OwnerResult =
  | { ok: true; ownerId: string | null; userId: string | null }
  | { ok: false; response: Response }

// Dono do carrinho: o usuário logado (token) ou o visitante (X-Guest-Cart).
// Um visitante nunca acessa o carrinho de um usuário: os ids têm prefixos
// diferentes e o de usuário só vem de um token válido.
export function resolveCartOwner(request: Request): OwnerResult {
  if (request.headers.get('Authorization')) {
    const auth = authenticate(request)
    if (!auth.ok) return { ok: false, response: auth.response }
    return { ok: true, ownerId: auth.user.id, userId: auth.user.id }
  }
  const guest = request.headers.get('X-Guest-Cart')
  if (guest && GUEST_ID.test(guest)) {
    return { ok: true, ownerId: guest, userId: null }
  }
  return { ok: true, ownerId: null, userId: null }
}

export function getCartRecord(ownerId: string): CartRecord {
  db.state.carts[ownerId] ??= {
    items: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
  }
  return db.state.carts[ownerId]
}

export function touch(record: CartRecord) {
  record.updatedAt = new Date().toISOString()
  db.commit()
}

export function findEdition(nftId: string, editionId: string) {
  const nft = db.state.nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export function toCart(ownerId: string | null): Cart {
  const record = ownerId ? db.state.carts[ownerId] : undefined
  const items: CartItem[] = []
  for (const item of record?.items ?? []) {
    const found = findEdition(item.nftId, item.editionId)
    if (!found) continue
    items.push({
      id: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      nft: {
        id: found.nft.id,
        name: found.nft.name,
        tokenId: found.nft.tokenId,
        image: found.nft.image,
        priceEth: found.nft.priceEth,
        version: found.nft.version,
      },
      edition: found.edition,
      lineTotalEth: mulEth(found.nft.priceEth, item.quantity),
    })
  }
  return {
    items,
    couponCode: record?.couponCode ?? null,
    subtotalEth: addEth('0', ...items.map((i) => i.lineTotalEth)),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    updatedAt: record?.updatedAt ?? new Date(0).toISOString(),
  }
}

export function checkCoupon(
  code: string,
): { ok: true; coupon: CouponRecord } | { ok: false; response: Response } {
  const normalized = code.trim().toUpperCase()
  const coupon = db.state.coupons.find((c) => c.code === normalized)
  if (!coupon) {
    return {
      ok: false,
      response: apiError(422, 'COUPON_INVALID', 'Cupom inválido.', {
        couponCode: 'Este código promocional não existe.',
      }),
    }
  }
  if (Date.parse(coupon.expiresAt) <= Date.now()) {
    return {
      ok: false,
      response: apiError(422, 'COUPON_EXPIRED', 'Cupom expirado.', {
        couponCode: 'Este código promocional expirou.',
      }),
    }
  }
  return { ok: true, coupon }
}

export function stockMessage(name: string, available: number) {
  return available === 0
    ? `${name}: esta edição esgotou.`
    : `${name}: só há ${available} disponíve${available === 1 ? 'l' : 'is'} nesta edição.`
}

type QuoteResult =
  { ok: true; quote: Quote } | { ok: false; response: Response }

// Calcula a cotação a partir do estado atual do catálogo.
// O front nunca soma valores: ele exibe o que vem daqui.
export function buildQuote(
  ownerId: string,
  items: Array<{ nftId: string; editionId: string; quantity: number }>,
  couponCode: string | undefined,
  network: Network,
): QuoteResult {
  if (items.length === 0) {
    return {
      ok: false,
      response: apiError(422, 'VALIDATION_ERROR', 'O carrinho está vazio.'),
    }
  }
  const lines: Quote['items'] = []
  for (const item of items) {
    const found = findEdition(item.nftId, item.editionId)
    if (!found) {
      return {
        ok: false,
        response: apiError(404, 'NOT_FOUND', 'Um dos NFTs não existe mais.'),
      }
    }
    if (item.quantity > found.edition.available) {
      return {
        ok: false,
        response: apiError(
          409,
          'OUT_OF_STOCK',
          stockMessage(found.nft.name, found.edition.available),
        ),
      }
    }
    lines.push({
      ...item,
      name: found.nft.name,
      tokenId: found.nft.tokenId,
      image: found.nft.image,
      editionKind: found.edition.kind,
      unitPriceEth: found.nft.priceEth,
      lineTotalEth: mulEth(found.nft.priceEth, item.quantity),
    })
  }

  let coupon: CouponRecord | null = null
  if (couponCode) {
    const checked = checkCoupon(couponCode)
    if (!checked.ok) return checked
    coupon = checked.coupon
  }

  const subtotalEth = addEth('0', ...lines.map((l) => l.lineTotalEth))
  const discountEth = coupon ? percentOf(subtotalEth, coupon.percentOff) : '0'
  const networkFeeEth = NETWORK_FEES[network]
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)
  const now = Date.now()

  const quote: QuoteRecord = {
    id: db.nextId('qte'),
    ownerId,
    items: lines,
    coupon: coupon
      ? { code: coupon.code, percentOff: coupon.percentOff }
      : null,
    network,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
  db.state.quotes = [...db.state.quotes.slice(-49), quote]
  db.commit()
  const { ownerId: _owner, ...publicQuote } = quote
  void _owner
  return { ok: true, quote: publicQuote }
}
