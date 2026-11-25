import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'
import { sessionToken } from '@/shared/api/session-token'
import type { Session } from '@/shared/api/types'
import { fetchSession } from './api'

export const sessionKey = ['session'] as const

// Sem token: visitante. Com token: pergunta à API se a sessão ainda vale.
export function sessionQuery() {
  return queryOptions({
    queryKey: sessionKey,
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!sessionToken.get()) return null
      try {
        return await fetchSession(signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: Infinity,
  })
}

export function useSession() {
  const { data, isPending } = useQuery(sessionQuery())
  return { user: data?.user ?? null, isPending }
}

// Dados privados sempre levam o id do usuário na query key:
// o cache do usuário A nunca é lido pelo usuário B.
export const userKeys = {
  all: (userId: string) => ['user', userId] as const,
}

// Troca de sessão (login, logout, expiração): remove todo dado privado
// do cache e grava a nova sessão. O catálogo é público e continua em cache.
export function replaceSession(
  queryClient: QueryClient,
  session: Session | null,
) {
  queryClient.removeQueries({ queryKey: ['user'] })
  queryClient.setQueryData(sessionKey, session)
}

export function safeRedirect(value: unknown): string | undefined {
  // Só caminhos internos, para o ?redirect= não virar um redirecionamento
  // para outro site.
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  if (value.startsWith('/entrar') || value.startsWith('/cadastro'))
    return undefined
  return value
}
