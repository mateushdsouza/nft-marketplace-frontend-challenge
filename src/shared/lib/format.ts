// 0x7A42c1F9…19E8 → 0x7A42…19E8
export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
