import type { Network } from '@/shared/api/types'

// Ethereum e Polygon usam o mesmo formato (EVM): 0x + 40 hexadecimais.
// Solana usa base58 (sem 0, O, I e l), com 32 a 44 caracteres.
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function addressError(network: Network, address: string): string | null {
  if (network === 'solana') {
    return SOLANA_ADDRESS.test(address)
      ? null
      : 'Endereço Solana inválido: use 32 a 44 caracteres base58.'
  }
  return EVM_ADDRESS.test(address)
    ? null
    : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
}
