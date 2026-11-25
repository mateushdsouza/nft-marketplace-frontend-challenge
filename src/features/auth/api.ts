import { api } from '@/shared/api/client'
import type { LoginRequest, RegisterRequest, Session } from '@/shared/api/types'

export async function login(body: LoginRequest) {
  const { data } = await api.post<Session>('/auth/login', body)
  return data
}

export async function register(body: RegisterRequest) {
  const { data } = await api.post<Session>('/auth/register', body)
  return data
}

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await api.get<Session>('/auth/session', { signal })
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}
