import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { NETWORKS } from '@/shared/api/types'
import { authenticate } from '../auth'
import {
  buildQuote,
  checkCoupon,
  findEdition,
  getCartRecord,
  resolveCartOwner,
  stockMessage,
  toCart,
  touch,
} from '../cart'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'

const quantity = z.number().int().min(1).max(99)

const addSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity,
})

const quoteSchema = z.object({
  items: z
    .array(z.object({ nftId: z.string(), editionId: z.string(), quantity }))
    .max(50),
  couponCode: z.string().trim().max(32).optional(),
  network: z.enum(NETWORKS),
})

async function readJson(request: Request) {
  return request.json().catch(() => ({}))
}

const missingOwner = () =>
  apiError(422, 'VALIDATION_ERROR', 'Carrinho de visitante não informado.')

export const cartHandlers = [
  http.get(
    `${API}/cart`,
    withNetwork(({ request }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      return HttpResponse.json(toCart(owner.ownerId))
    }),
  ),

  http.post(
    `${API}/cart/items`,
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      if (!owner.ownerId) return missingOwner()
      const parsed = addSchema.safeParse(await readJson(request))
      if (!parsed.success) {
        return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
      }
      const { nftId, editionId, quantity: qty } = parsed.data
      const found = findEdition(nftId, editionId)
      if (!found) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')

      const record = getCartRecord(owner.ownerId)
      const existing = record.items.find(
        (i) => i.nftId === nftId && i.editionId === editionId,
      )
      const total = (existing?.quantity ?? 0) + qty
      if (total > found.edition.available) {
        const already = existing
          ? ` Você já tem ${existing.quantity} no carrinho.`
          : ''
        return apiError(
          409,
          'OUT_OF_STOCK',
          stockMessage(found.nft.name, found.edition.available) + already,
        )
      }
      if (existing) existing.quantity = total
      else
        record.items.push({
          id: db.nextId('item'),
          nftId,
          editionId,
          quantity: qty,
        })
      touch(record)
      return HttpResponse.json(toCart(owner.ownerId), { status: 201 })
    }),
  ),

  http.patch(
    `${API}/cart/items/:itemId`,
    withNetwork(async ({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      if (!owner.ownerId) return missingOwner()
      const parsed = z.object({ quantity }).safeParse(await readJson(request))
      if (!parsed.success) {
        return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.', {
          quantity: 'Use um número inteiro a partir de 1.',
        })
      }
      const record = getCartRecord(owner.ownerId)
      const item = record.items.find((i) => i.id === params.itemId)
      if (!item) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')
      const found = findEdition(item.nftId, item.editionId)
      if (!found) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      if (parsed.data.quantity > found.edition.available) {
        return apiError(
          409,
          'OUT_OF_STOCK',
          stockMessage(found.nft.name, found.edition.available),
        )
      }
      item.quantity = parsed.data.quantity
      touch(record)
      return HttpResponse.json(toCart(owner.ownerId))
    }),
  ),

  http.delete(
    `${API}/cart/items/:itemId`,
    withNetwork(({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      if (!owner.ownerId) return missingOwner()
      const record = getCartRecord(owner.ownerId)
      record.items = record.items.filter((i) => i.id !== params.itemId)
      // Carrinho vazio começa do zero: o cupom não fica guardado.
      if (record.items.length === 0) record.couponCode = null
      touch(record)
      return HttpResponse.json(toCart(owner.ownerId))
    }),
  ),

  http.put(
    `${API}/cart/coupon`,
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      if (!owner.ownerId) return missingOwner()
      const body = (await readJson(request)) as { code?: unknown }
      const code = typeof body.code === 'string' ? body.code : ''
      if (!code.trim()) {
        return apiError(422, 'VALIDATION_ERROR', 'Digite um código.', {
          couponCode: 'Digite um código promocional.',
        })
      }
      const checked = checkCoupon(code)
      if (!checked.ok) return checked.response
      const record = getCartRecord(owner.ownerId)
      record.couponCode = checked.coupon.code
      touch(record)
      return HttpResponse.json(toCart(owner.ownerId))
    }),
  ),

  http.delete(
    `${API}/cart/coupon`,
    withNetwork(({ request }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      if (!owner.ownerId) return missingOwner()
      const record = getCartRecord(owner.ownerId)
      record.couponCode = null
      touch(record)
      return HttpResponse.json(toCart(owner.ownerId))
    }),
  ),

  // Junta o carrinho do visitante ao do usuário que acabou de entrar.
  // Quantidades somadas respeitam o estoque; o carrinho do visitante é apagado.
  http.post(
    `${API}/cart/merge`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = (await readJson(request)) as { guestCartId?: unknown }
      const guestId =
        typeof body.guestCartId === 'string' ? body.guestCartId : ''
      const guest = guestId.startsWith('guest_')
        ? db.state.carts[guestId]
        : undefined
      const record = getCartRecord(auth.user.id)
      let adjusted = false
      for (const item of guest?.items ?? []) {
        const found = findEdition(item.nftId, item.editionId)
        if (!found) continue
        const existing = record.items.find(
          (i) => i.nftId === item.nftId && i.editionId === item.editionId,
        )
        const wanted = (existing?.quantity ?? 0) + item.quantity
        const allowed = Math.min(wanted, found.edition.available)
        if (allowed < wanted) adjusted = true
        if (allowed === 0) continue
        if (existing) existing.quantity = allowed
        else
          record.items.push({
            ...item,
            id: db.nextId('item'),
            quantity: allowed,
          })
      }
      if (guest?.couponCode && !record.couponCode) {
        record.couponCode = guest.couponCode
      }
      if (guestId) delete db.state.carts[guestId]
      touch(record)
      return HttpResponse.json({ cart: toCart(auth.user.id), adjusted })
    }),
  ),

  http.post(
    `${API}/quote`,
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (!owner.ok) return owner.response
      const parsed = quoteSchema.safeParse(await readJson(request))
      if (!parsed.success) {
        return apiError(422, 'VALIDATION_ERROR', 'Cotação inválida.')
      }
      const { items, couponCode, network } = parsed.data
      const result = buildQuote(
        owner.ownerId ?? 'anonymous',
        items,
        couponCode || undefined,
        network,
      )
      if (!result.ok) return result.response
      return HttpResponse.json(result.quote)
    }),
  ),
]
