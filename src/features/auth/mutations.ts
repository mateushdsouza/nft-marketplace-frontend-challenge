import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { sessionToken } from '@/shared/api/session-token'
import type { Session } from '@/shared/api/types'
import { login, logout, register } from './api'
import { replaceSession } from './queries'

// Entrar numa conta começa sem nenhum dado privado em cache: nada do
// usuário anterior fica visível para o novo.
function useStartSession() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return async (session: Session, redirectTo?: string) => {
    sessionToken.set(session.token)
    replaceSession(queryClient, session)
    await router.invalidate()
    await router.navigate({ href: redirectTo ?? '/' })
  }
}

export function useLogin(redirectTo?: string) {
  const startSession = useStartSession()
  return useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      await startSession(session, redirectTo)
      toast.success(`Bem-vindo de volta, ${session.user.displayName}.`)
    },
  })
}

export function useRegister(redirectTo?: string) {
  const startSession = useStartSession()
  return useMutation({
    mutationFn: register,
    onSuccess: async (session) => {
      await startSession(session, redirectTo)
      toast.success('Conta criada. Bem-vindo à Kurio!')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      // Mesmo se a API falhar, a sessão local é encerrada.
      await logout().catch(() => undefined)
    },
    onSettled: async () => {
      sessionToken.clear()
      replaceSession(queryClient, null)
      await router.invalidate()
      await router.navigate({ to: '/' })
      toast.info('Você saiu da sua conta.')
    },
  })
}
