import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { sessionToken } from '@/shared/api/session-token'
import { replaceSession } from './queries'

// Reage à sessão expirada detectada pelo interceptor do Axios:
// limpa os dados privados e, se a tela atual exige login, manda para
// o login guardando o endereço para voltar depois.
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    return sessionToken.onExpired(() => {
      replaceSession(queryClient, null)
      toast.error('Sua sessão expirou. Entre novamente para continuar.', {
        id: 'session-expired',
      })
      const { matches, location } = router.state
      const isPrivate = matches.some((m) => m.routeId.startsWith('/_auth'))
      if (isPrivate) {
        router.navigate({
          to: '/entrar',
          search: { redirect: location.href },
        })
      } else {
        router.invalidate()
      }
    })
  }, [queryClient, router])

  return null
}
