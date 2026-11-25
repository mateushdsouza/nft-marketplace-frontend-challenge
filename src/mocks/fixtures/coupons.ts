import type { EthAmount, Network } from '@/shared/api/types'

export interface CouponRecord {
  code: string
  percentOff: number
  expiresAt: string
}

export function createCouponFixtures(): CouponRecord[] {
  return [
    { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59Z' },
    { code: 'GENESIS25', percentOff: 25, expiresAt: '2099-12-31T23:59:59Z' },
    { code: 'LANCAMENTO', percentOff: 15, expiresAt: '2025-01-31T23:59:59Z' },
  ]
}

// Taxa de rede fixa por pedido, em ETH.
export const NETWORK_FEES: Record<Network, EthAmount> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0008',
}
