// ---------------------------------------------------------------------------
// TAREFA DO MATEUS — chave de idempotência da compra
//
// Cada "tentativa de compra" tem UMA chave (Idempotency-Key). Regras:
//
// 1. getAttemptKey(quoteId)
//    - Se já existe uma tentativa guardada para ESTE quoteId, devolve a mesma
//      chave (inclusive depois de recarregar a página).
//    - Se não existe, ou se a tentativa guardada é de OUTRO quoteId, gera uma
//      chave nova com crypto.randomUUID(), guarda { quoteId, key } e devolve.
//
// 2. clearAttempt()
//    - Apaga a tentativa guardada (chamado quando o pedido termina).
//
// Guarde no sessionStorage, com a chave ATTEMPT_STORAGE_KEY, em JSON.
// Dica: localStorage/sessionStorage podem lançar erro (modo privado), então
// use try/catch como em src/shared/api/session-token.ts.
//
// Critério de pronto: npx playwright test checkout passa.
// ---------------------------------------------------------------------------

export const ATTEMPT_STORAGE_KEY = 'kurio:checkout-attempt'

export function getAttemptKey(_quoteId: string): string {
  void _quoteId // remova esta linha ao implementar
  throw new Error('TODO: implementar getAttemptKey')
}

export function clearAttempt(): void {
  throw new Error('TODO: implementar clearAttempt')
}
