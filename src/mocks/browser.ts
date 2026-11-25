import { setupWorker } from 'msw/browser'
import { controlHandlers } from './handlers/control'
import { nftHandlers } from './handlers/nfts'
import { applyScenarioFromUrl } from './scenarios'

export const worker = setupWorker(...controlHandlers, ...nftHandlers)

export async function startMocks() {
  applyScenarioFromUrl()
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
  // Sinal para os testes E2E saberem que o backend falso já responde.
  document.documentElement.dataset.mocks = 'ready'
}
