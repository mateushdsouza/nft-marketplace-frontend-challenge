import { toast } from 'sonner'

// Ações fora do escopo do desafio: avisam em vez de fingir que funcionaram.
export function comingSoon(feature: string) {
  toast.info(`${feature} ainda não está disponível nesta versão.`)
}
