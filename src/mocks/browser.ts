import { setupWorker } from 'msw/browser'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { controlHandlers } from './handlers/control'
import { nftHandlers } from './handlers/nfts'
import { applyScenarioFromUrl } from './scenarios'

export const worker = setupWorker(
  ...controlHandlers,
  ...authHandlers,
  ...cartHandlers,
  ...nftHandlers,
)

export async function startMocks() {
  applyScenarioFromUrl()
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
  // Sinal para os testes E2E saberem que o backend falso já responde.
  document.documentElement.dataset.mocks = 'ready'
}
