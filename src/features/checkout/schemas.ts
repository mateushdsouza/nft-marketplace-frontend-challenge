import { z } from 'zod'
import { NETWORKS } from '@/shared/api/types'

// ---------------------------------------------------------------------------
// TAREFA DO MATEUS — validação do formulário de pagamento
//
// Troque cada z.string() pelas regras abaixo, com as mensagens exatas
// (os testes procuram por elas):
//
// - displayName: obrigatório, 2 a 60 caracteres (use .trim()).
//     "Digite seu nome de exibição." | "Use no máximo 60 caracteres."
// - username: mesma regra do cadastro (src/features/auth/schemas.ts).
// - email: e-mail válido. "Digite um e-mail válido."
// - note: opcional, até 280 caracteres. "Use no máximo 280 caracteres."
//     (o campo vazio chega como "" — isso precisa ser aceito)
// - walletId: obrigatório. "Escolha uma carteira."
// - network: já está pronto.
//
// Critério de pronto: npx playwright test checkout passa.
// ---------------------------------------------------------------------------

export const checkoutSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  note: z.string(),
  walletId: z.string(),
  network: z.enum(NETWORKS),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>
