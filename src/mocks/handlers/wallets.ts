import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { NETWORKS, type Wallet } from '@/shared/api/types'
import { addressError } from '@/shared/lib/wallet-address'
import { authenticate } from '../auth'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'
import { scenario } from '../scenarios'

// Conexões ficam só em memória: recarregar a página "desconecta" a carteira,
// como acontece com uma extensão de carteira de verdade.
export const connectedWallets = new Set<string>()

const walletFields = z.object({
  slot: z.enum(['primary', 'secondary']),
  nickname: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(40),
  network: z.enum(NETWORKS),
  address: z.string().trim(),
  provider: z.enum(['metamask', 'coinbase', 'walletconnect']),
  ensName: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .transform((v) => v || null),
})

// O formato do endereço depende da rede (EVM ou Solana).
function checkAddress(
  value: { network: Wallet['network']; address: string },
  ctx: z.RefinementCtx,
) {
  const message = addressError(value.network, value.address)
  if (message) ctx.addIssue({ code: 'custom', path: ['address'], message })
}

const createWalletSchema = walletFields.superRefine(checkAddress)
const updateWalletSchema = walletFields
  .omit({ slot: true })
  .superRefine(checkAddress)

function fieldErrorsOf(error: z.ZodError) {
  const result: Record<string, string> = {}
  for (const issue of error.issues)
    result[String(issue.path[0])] ??= issue.message
  return result
}

function walletsOf(userId: string): Wallet[] {
  db.state.wallets[userId] ??= []
  return db.state.wallets[userId]
}

export const walletHandlers = [
  http.get(
    `${API}/wallets`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      return HttpResponse.json(walletsOf(auth.user.id))
    }),
  ),

  http.post(
    `${API}/wallets`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const parsed = createWalletSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      if (!parsed.success) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Confira os campos da carteira.',
          fieldErrorsOf(parsed.error),
        )
      }
      const wallets = walletsOf(auth.user.id)
      if (wallets.some((w) => w.slot === parsed.data.slot)) {
        return apiError(
          409,
          'CONFLICT',
          'Já existe uma carteira nesse espaço.',
          {
            slot: 'Edite a carteira existente em vez de criar outra.',
          },
        )
      }
      const wallet: Wallet = { id: db.nextId('wal'), ...parsed.data }
      wallets.push(wallet)
      db.commit()
      return HttpResponse.json(wallet, { status: 201 })
    }),
  ),

  http.patch(
    `${API}/wallets/:id`,
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const wallets = walletsOf(auth.user.id)
      const index = wallets.findIndex((w) => w.id === params.id)
      if (index === -1) {
        return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      }
      const parsed = updateWalletSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      if (!parsed.success) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Confira os campos da carteira.',
          fieldErrorsOf(parsed.error),
        )
      }
      wallets[index] = { ...wallets[index], ...parsed.data }
      connectedWallets.delete(wallets[index].id)
      db.commit()
      return HttpResponse.json(wallets[index])
    }),
  ),

  // Simulação da extensão de carteira: aprovar ou recusar a conexão.
  http.post(
    `${API}/wallets/:id/connect`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const wallet = walletsOf(auth.user.id).find((w) => w.id === params.id)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      if (scenario.name === 'wallet-rejected') {
        return apiError(
          409,
          'WALLET_REJECTED',
          'A conexão foi recusada na carteira.',
        )
      }
      connectedWallets.add(wallet.id)
      return HttpResponse.json({ walletId: wallet.id, connected: true })
    }),
  ),

  http.post(
    `${API}/wallets/:id/disconnect`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      connectedWallets.delete(String(params.id))
      return HttpResponse.json({ walletId: params.id, connected: false })
    }),
  ),
]
