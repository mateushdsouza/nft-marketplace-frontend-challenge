import { HttpResponse } from 'msw'

// Condições de rede do backend falso. O cenário ativo fica no localStorage,
// então sobrevive a refresh. Pode ser trocado por:
//   - query string ao abrir o app: /?scenario=slow
//   - POST /api/__scenario { "name": "slow" } (usado pelos testes)

export const SCENARIOS = {
  default: 'Latência curta e respostas de sucesso',
  fast: 'Sem latência (testes)',
  slow: 'Toda requisição demora ~2,5 s',
  'random-latency':
    'Latência variável e reproduzível (respostas fora de ordem)',
  offline: 'Falha de conexão em toda a API',
  'server-error': 'HTTP 503 em toda a API',
  'catalog-empty': 'Catálogo sem resultados',
  'wallet-rejected': 'A carteira recusa a conexão',
  'payment-rejected': 'Pedidos são recusados pela rede',
  'favorite-error':
    'A API de favoritos responde 503 (rollback da atualização otimista)',
  'order-timeout':
    'O pedido é criado, mas a primeira resposta se perde (recuperação por idempotência)',
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mock-scenario'

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && value in SCENARIOS
}

function readStored(): ScenarioName {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (isScenarioName(value)) return value
  } catch {
    // ignora
  }
  return 'default'
}

let current: ScenarioName = readStored()

// Gerador pseudoaleatório com semente fixa: a sequência de latências
// é sempre a mesma depois de um reset, então os testes são reproduzíveis.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let random = mulberry32(42)

export const scenario = {
  get name(): ScenarioName {
    return current
  },

  set(name: ScenarioName) {
    current = name
    random = mulberry32(42)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch {
      // ignora
    }
  },

  latencyMs(): number {
    switch (current) {
      case 'fast':
        return 0
      case 'slow':
        return 2500
      case 'random-latency':
        return 100 + Math.floor(random() * 1400)
      default:
        return 150 + Math.floor(random() * 250)
    }
  },

  // Resposta de falha que substitui a resposta real, ou null.
  failure(): Response | null {
    if (current === 'offline') return HttpResponse.error()
    if (current === 'server-error') {
      return HttpResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Serviço temporariamente indisponível.',
          },
        },
        { status: 503 },
      )
    }
    return null
  },
}

export function applyScenarioFromUrl() {
  const value = new URLSearchParams(window.location.search).get('scenario')
  if (isScenarioName(value)) scenario.set(value)
}
