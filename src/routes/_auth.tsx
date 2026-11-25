import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQuery } from '@/features/auth/queries'

// Rota sem caminho próprio ("pathless"): tudo dentro de src/routes/_auth/
// exige login. Equivale a um canActivate do Angular aplicado ao grupo.
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery())
    if (!session) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
    return { user: session.user }
  },
  component: Outlet,
})
