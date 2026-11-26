import { z } from 'zod'
import { NETWORKS } from '@/shared/api/types'
import { addressError } from '@/shared/lib/wallet-address'

export const walletFormSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(2, 'Use pelo menos 2 caracteres.')
      .max(40, 'Use no máximo 40 caracteres.'),
    network: z.enum(NETWORKS),
    address: z.string().trim().min(1, 'Digite o endereço da carteira.'),
    provider: z.enum(['metamask', 'coinbase', 'walletconnect']),
    ensName: z.string().trim().max(40, 'Use no máximo 40 caracteres.'),
  })
  // O formato do endereço depende da rede escolhida, então a regra olha os
  // dois campos juntos (≈ uma validação de classe no Bean Validation).
  .superRefine((value, ctx) => {
    if (!value.address) return
    const message = addressError(value.network, value.address)
    if (message) ctx.addIssue({ code: 'custom', path: ['address'], message })
  })
export type WalletFormValues = z.infer<typeof walletFormSchema>
