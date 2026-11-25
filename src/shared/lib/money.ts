import Decimal from 'decimal.js'
import type { EthAmount } from '@/shared/api/types'

// Number em JS é ponto flutuante: 0.1 + 0.2 === 0.30000000000000004.
// Todo cálculo com ETH passa por Decimal e volta como string.

export function toDecimal(value: EthAmount): Decimal {
  return new Decimal(value)
}

export function addEth(...values: EthAmount[]): EthAmount {
  return values.reduce((sum, v) => sum.plus(v), new Decimal(0)).toString()
}

export function subEth(a: EthAmount, b: EthAmount): EthAmount {
  return new Decimal(a).minus(b).toString()
}

export function mulEth(value: EthAmount, quantity: number): EthAmount {
  return new Decimal(value).times(quantity).toString()
}

export function percentOf(value: EthAmount, percent: number): EthAmount {
  return new Decimal(value)
    .times(percent)
    .dividedBy(100)
    .toDecimalPlaces(8, Decimal.ROUND_DOWN)
    .toString()
}

export function compareEth(a: EthAmount, b: EthAmount): number {
  return new Decimal(a).comparedTo(b)
}

export function isValidEth(value: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  return new Decimal(value).isFinite()
}

// "1.19" → "1.19 ETH", "2" → "2.00 ETH", "26.846" → "26.846 ETH"
export function formatEth(value: EthAmount, withUnit = true): string {
  const d = new Decimal(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
  const places = Math.max(2, d.decimalPlaces())
  const text = d.toFixed(places)
  return withUnit ? `${text} ETH` : text
}
