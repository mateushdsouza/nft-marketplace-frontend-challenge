import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from './app/query-client'
import { setBackendReady } from './shared/api/backend-ready'
import './index.css'
import { routeTree } from './routeTree.gen'

const queryClient = createQueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Com o QueryClient cuidando do cache, o Router não precisa guardar dados.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// O app desenha na hora. Com os mocks ligados, o worker do MSW sobe em
// paralelo e as chamadas à API esperam por ele (src/shared/api/backend-ready.ts).
// Import dinâmico: sem mocks, o código do mock nem entra no bundle principal.
async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
}

enableMocks()
  .catch((error: unknown) => console.error('Falha ao iniciar os mocks', error))
  .finally(setBackendReady)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
