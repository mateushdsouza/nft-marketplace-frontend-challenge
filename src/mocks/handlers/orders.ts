import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { authenticate } from '../auth'
import { buildQuote } from '../cart'
import { db, type OrderRecord } from '../db'
import { API, apiError, withNetwork } from '../http'
import {
  ORDER_PROCESSING_MS,
  droppedResponses,
  sameQuote,
  scheduleSettlement,
  settleIfDue,
  toPublicOrder,
} from '../orders'
import { scenario } from '../scenarios'
import { connectedWallets } from './wallets'

const orderSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  buyer: z.object({
    displayName: z.string().trim().min(2).max(60),
    email: z.email(),
    username: z.string().trim().min(3).max(24),
    note: z.string().trim().max(280).nullable(),
  }),
})

export const orderHandlers = [
  http.post(
    `${API}/orders`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response

      const key = request.headers.get('Idempotency-Key')?.trim()
      if (!key || key.length > 100) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Envie o header Idempotency-Key.',
        )
      }
      const parsed = orderSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      if (!parsed.success) {
        return apiError(422, 'VALIDATION_ERROR', 'Dados do pedido inválidos.')
      }
      const body = parsed.data
      const requestHash = JSON.stringify(body)

      // 1) Idempotência vem antes de tudo: repetir a mesma tentativa devolve
      // o mesmo pedido, mesmo que o preço tenha mudado depois.
      const existing = db.state.orders.find(
        (o) => o.userId === auth.user.id && o.idempotencyKey === key,
      )
      if (existing) {
        if (existing.requestHash !== requestHash) {
          return apiError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Esta chave já foi usada em um pedido diferente.',
          )
        }
        settleIfDue(existing)
        return HttpResponse.json(toPublicOrder(existing))
      }

      // 2) Cotação e carteira.
      const quote = db.state.quotes.find(
        (q) => q.id === body.quoteId && q.ownerId === auth.user.id,
      )
      if (!quote) {
        return apiError(422, 'VALIDATION_ERROR', 'Cotação não encontrada.')
      }
      const wallet = db.state.wallets[auth.user.id]?.find(
        (w) => w.id === body.walletId,
      )
      if (!wallet) {
        return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      }
      if (wallet.network !== quote.network) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'A carteira escolhida é de outra rede.',
          { walletId: 'Escolha uma carteira da mesma rede do pedido.' },
        )
      }
      if (!connectedWallets.has(wallet.id)) {
        return apiError(
          409,
          'WALLET_DISCONNECTED',
          'A carteira foi desconectada. Conecte de novo para confirmar.',
        )
      }

      // 3) Revalidação: refaz a cotação com o catálogo de agora.
      const fresh = buildQuote(
        auth.user.id,
        quote.items.map(({ nftId, editionId, quantity }) => ({
          nftId,
          editionId,
          quantity,
        })),
        quote.coupon?.code,
        quote.network,
      )
      if (!fresh.ok) return fresh.response
      const expired = Date.parse(quote.expiresAt) <= Date.now()
      if (expired || !sameQuote(quote, fresh.quote)) {
        return apiError(
          409,
          'QUOTE_CHANGED',
          expired
            ? 'A cotação expirou. Confira os valores atualizados.'
            : 'Os valores mudaram desde a revisão. Confira e confirme de novo.',
          undefined,
          { quote: fresh.quote },
        )
      }

      // 4) Cria o pedido pendente. O resultado vem depois.
      const now = Date.now()
      const order: OrderRecord = {
        id: db.nextId('ord'),
        userId: auth.user.id,
        idempotencyKey: key,
        requestHash,
        outcome:
          scenario.name === 'payment-rejected' ? 'rejected' : 'confirmed',
        settleAt: now + ORDER_PROCESSING_MS,
        status: 'pending',
        items: quote.items,
        coupon: quote.coupon,
        network: quote.network,
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        wallet: {
          id: wallet.id,
          nickname: wallet.nickname,
          address: wallet.address,
          provider: wallet.provider,
        },
        buyer: body.buyer,
        txHash: null,
        explorerUrl: null,
        failureReason: null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        version: 1,
      }
      db.state.orders.push(order)
      db.commit()
      scheduleSettlement(order)

      // Cenário: o pedido foi criado, mas a resposta se perdeu no caminho.
      if (scenario.name === 'order-timeout' && !droppedResponses.has(key)) {
        droppedResponses.add(key)
        return HttpResponse.error()
      }
      return HttpResponse.json(toPublicOrder(order), { status: 201 })
    }),
  ),

  http.get(
    `${API}/orders`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const mine = db.state.orders.filter((o) => o.userId === auth.user.id)
      mine.forEach(settleIfDue)
      return HttpResponse.json(mine.map(toPublicOrder).reverse())
    }),
  ),

  http.get(
    `${API}/orders/:id`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const order = db.state.orders.find((o) => o.id === params.id)
      if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      // Pedido de outra pessoa: nunca expor os dados.
      if (order.userId !== auth.user.id) {
        return apiError(403, 'FORBIDDEN', 'Este pedido não é seu.')
      }
      settleIfDue(order)
      return HttpResponse.json(toPublicOrder(order))
    }),
  ),
]
