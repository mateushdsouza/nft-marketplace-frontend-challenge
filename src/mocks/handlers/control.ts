import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { API, apiError } from '../http'
import { isScenarioName, scenario, SCENARIOS } from '../scenarios'

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
]
