// Porteiro dos eventos do socket: decide se um evento deve ser aplicado.
// Recusa o que já foi processado (mesmo eventId) e o que é mais antigo
// que a última versão aplicada daquele recurso.

export interface GateEvent {
  eventId: string
  resource: { type: string; id: string }
  version: number
}

export function createEventGate() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return function accept(event: GateEvent): boolean {
    if (seen.has(event.eventId)) return false

    const key = `${event.resource.type}:${event.resource.id}`
    const last = versions.get(key)
    if (last !== undefined && event.version <= last) return false

    seen.add(event.eventId)
    versions.set(key, event.version)
    return true
  }
}
