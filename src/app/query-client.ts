import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados do catálogo podem ficar 30 s em cache sem refetch.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Só repete falhas transitórias (sem conexão, timeout, 503).
        // 404, 401 e 422 não melhoram tentando de novo.
        retry: (failureCount, error) =>
          error instanceof ApiError && error.isTransient && failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
