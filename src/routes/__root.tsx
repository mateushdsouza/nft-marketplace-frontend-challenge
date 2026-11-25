import type { QueryClient } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { MobileNav } from '@/shared/layout/mobile-nav'
import { SiteFooter } from '@/shared/layout/site-footer'
import { SiteHeader } from '@/shared/layout/site-header'
import { Button } from '@/shared/ui/button'
import { Toaster } from '@/shared/ui/sonner'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-button bg-primary px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <div id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
      <SiteFooter />
      <MobileNav />
      <Toaster position="top-center" />
      <SessionWatcher />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
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
