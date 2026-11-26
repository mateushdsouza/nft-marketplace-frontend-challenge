import { useQuery } from '@tanstack/react-query'
import { useSession, userKeys } from '@/features/auth/queries'
import { api } from '@/shared/api/client'
import type { Wallet, WalletInput } from '@/shared/api/types'

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await api.get<Wallet[]>('/wallets', { signal })
  return data
}

export async function createWallet(input: WalletInput) {
  const { data } = await api.post<Wallet>('/wallets', input)
  return data
}

export async function updateWallet(
  id: string,
  input: Omit<WalletInput, 'slot'>,
) {
  const { data } = await api.patch<Wallet>(`/wallets/${id}`, input)
  return data
}

export async function connectWallet(id: string) {
  await api.post(`/wallets/${id}/connect`)
}

export async function disconnectWallet(id: string) {
  await api.post(`/wallets/${id}/disconnect`)
}

export function walletsKey(userId: string) {
  return [...userKeys.all(userId), 'wallets'] as const
}

export function useWallets() {
  const { user } = useSession()
  return useQuery({
    queryKey: walletsKey(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchWallets(signal),
    enabled: !!user,
  })
}
