// Chave de idempotência da compra: uma por tentativa.
// Mesma cotação → mesma chave, inclusive depois de recarregar a página.
// Cotação diferente → chave nova (é outra tentativa).

export const ATTEMPT_STORAGE_KEY = 'kurio:checkout-attempt'

export function getAttemptKey(quoteId: string): string {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_STORAGE_KEY)

    if (raw) {
      const saved = JSON.parse(raw) as { quoteId: string; key: string }
      if (saved.quoteId === quoteId) {
        return saved.key
      }
    }
  } catch {
    // sessionStorage indisponível ou conteúdo inválido: cria uma chave nova
  }

  const key = crypto.randomUUID()
  try {
    sessionStorage.setItem(
      ATTEMPT_STORAGE_KEY,
      JSON.stringify({ quoteId, key }),
    )
  } catch {
    // sem armazenamento, a chave vale só enquanto a página estiver aberta
  }
  return key
}

export function clearAttempt(): void {
  try {
    sessionStorage.removeItem(ATTEMPT_STORAGE_KEY)
  } catch {
    // ignora
  }
}
