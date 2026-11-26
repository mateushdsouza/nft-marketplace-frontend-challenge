import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { sessionKey, useSession, userKeys } from '@/features/auth/queries'
import { api } from '@/shared/api/client'
import type {
  PasswordChange,
  ProfileUpdate,
  Session,
  User,
} from '@/shared/api/types'

export async function fetchProfile(signal?: AbortSignal) {
  const { data } = await api.get<User>('/profile', { signal })
  return data
}

export async function updateProfile(input: ProfileUpdate) {
  const { data } = await api.patch<User>('/profile', input)
  return data
}

export async function uploadAvatar(dataUrl: string) {
  const { data } = await api.post<User>('/profile/avatar', { dataUrl })
  return data
}

export async function removeAvatar() {
  const { data } = await api.delete<User>('/profile/avatar')
  return data
}

export async function changePassword(input: PasswordChange) {
  await api.post('/profile/password', input)
}

export function profileKey(userId: string) {
  return [...userKeys.all(userId), 'profile'] as const
}

export function useProfile() {
  const { user } = useSession()
  return useQuery({
    queryKey: profileKey(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: !!user,
  })
}

// O perfil salvo também é o usuário da sessão (nome e avatar no cabeçalho).
// Gravar a resposta nos dois lugares evita uma nova requisição.
function storeUser(queryClient: QueryClient, user: User) {
  queryClient.setQueryData(profileKey(user.id), user)
  queryClient.setQueryData<Session | null>(sessionKey, (old) =>
    old ? { ...old, user } : old,
  )
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: (user) => storeUser(queryClient, user),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
