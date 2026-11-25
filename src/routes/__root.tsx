import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Button } from '@/shared/ui/button'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24 text-center">
      <p className="text-sm font-bold text-text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-4 text-text-secondary">
        O endereço que você acessou não existe ou foi removido.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </main>
  )
}
