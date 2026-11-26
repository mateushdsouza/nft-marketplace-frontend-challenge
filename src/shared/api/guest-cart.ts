import { useSyncExternalStore } from 'react'

// Id do carrinho do visitante. O carrinho em si fica na API (mock);
// aqui só guardamos qual é o dele, para sobreviver a refresh.

const STORAGE_KEY = 'kurio:guest-cart'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let current = read()

function emit() {
  listeners.forEach((l) => l())
}

export const guestCart = {
  get: () => current,

  ensure(): string {
    if (current) return current
    current = `guest_${crypto.randomUUID()}`
    try {
      localStorage.setItem(STORAGE_KEY, current)
    } catch {
      // segue só em memória
    }
    emit()
    return current
  },

  clear() {
    current = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignora
    }
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useGuestCartId() {
  return useSyncExternalStore(guestCart.subscribe, guestCart.get, () => null)
}
