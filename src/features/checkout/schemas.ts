import { z } from 'zod'
import { NETWORKS } from '@/shared/api/types'

// Dados do colecionador no pagamento. A observação é opcional: vazia chega
// como "" e é enviada à API como null.

export const checkoutSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Digite seu nome de exibição.' })
    .max(60, { message: 'Use no máximo 60 caracteres.' }),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{3,24}$/i, 'Use 3 a 24 letras, números, ponto ou _.'),
  email: z.email('Digite um e-mail válido.'),
  note: z.string().max(280, 'Use no máximo 280 caracteres.'),
  walletId: z.string().nonempty('Escolha uma carteira.'),
  network: z.enum(NETWORKS),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>
