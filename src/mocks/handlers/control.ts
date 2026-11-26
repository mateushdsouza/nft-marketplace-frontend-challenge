import { http, HttpResponse } from 'msw'
import { isValidEth } from '@/shared/lib/money'
import { db } from '../db'
import { API, apiError } from '../http'
import { droppedResponses } from '../orders'
import { emitNftUpdated } from '../realtime'
import { isScenarioName, scenario, SCENARIOS } from '../scenarios'
import { connectedWallets } from './wallets'

// Endpoints de controle do mock. Não passam pelo cenário de rede,
// senão um cenário "offline" impediria de sair dele.
export const controlHandlers = [
  http.get(`${API}/__scenario`, () =>
    HttpResponse.json({ current: scenario.name, available: SCENARIOS }),
  ),

  http.post(`${API}/__scenario`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      name?: unknown
    } | null
    if (!isScenarioName(body?.name)) {
      return apiError(422, 'VALIDATION_ERROR', 'Cenário desconhecido.', {
        name: `Use um de: ${Object.keys(SCENARIOS).join(', ')}`,
      })
    }
    scenario.set(body.name)
    return HttpResponse.json({ current: scenario.name })
  }),

  http.post(`${API}/__reset`, () => {
    db.reset()
    connectedWallets.clear()
    droppedResponses.clear()
    scenario.set('default')
    return HttpResponse.json({ ok: true })
  }),

  // Simula a expiração de todas as sessões abertas (cenário "sessão expirada").
  http.post(`${API}/__sessions/expire`, () => {
    const past = new Date(Date.now() - 1000).toISOString()
    db.state.sessions = db.state.sessions.map((s) => ({
      ...s,
      expiresAt: past,
    }))
    db.commit()
    return HttpResponse.json({ expired: db.state.sessions.length })
  }),

  // Simula uma mudança no catálogo feita "por outra pessoa" (preço ou estoque).
  http.post(`${API}/__nfts/:id`, async ({ params, request }) => {
    const nft = db.state.nfts.find((n) => n.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const body = (await request.json().catch(() => ({}))) as {
      priceEth?: unknown
      editionId?: unknown
      available?: unknown
    }
    if (typeof body.priceEth === 'string' && isValidEth(body.priceEth)) {
      nft.priceEth = body.priceEth
    }
    if (
      typeof body.editionId === 'string' &&
      typeof body.available === 'number'
    ) {
      const edition = nft.editions.find((e) => e.id === body.editionId)
      if (edition) edition.available = Math.max(0, Math.floor(body.available))
    }
    nft.version += 1
    db.commit()
    emitNftUpdated(nft)
    return HttpResponse.json(nft)
  }),
]
