import type { Quote } from '@/shared/api/types'

// Duas cotações cobram a mesma coisa? O id sempre muda (cada cotação é
// nova), então compara o que importa para o comprador: itens, preços e total.
export function sameCharges(a: Quote, b: Quote) {
  if (a.network !== b.network) return false
  if (a.totalEth !== b.totalEth || a.networkFeeEth !== b.networkFeeEth) {
    return false
  }
  if (a.discountEth !== b.discountEth) return false
  if (a.items.length !== b.items.length) return false
  return a.items.every((line, i) => {
    const other = b.items[i]
    return (
      line.nftId === other.nftId &&
      line.editionId === other.editionId &&
      line.quantity === other.quantity &&
      line.unitPriceEth === other.unitPriceEth
    )
  })
}
