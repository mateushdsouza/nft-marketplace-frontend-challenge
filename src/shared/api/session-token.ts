// Token da sessão no localStorage, para sobreviver a refresh.
// Fica fora do React porque o interceptor do Axios também precisa dele.

const STORAGE_KEY = 'kurio:session-token'

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let current = read()
const expiredListeners = new Set<() => void>()

export const sessionToken = {
  get: () => current,

  set(token: string) {
    current = token
    try {
      localStorage.setItem(STORAGE_KEY, token)
    } catch {
      // segue só em memória
    }
  },

  clear() {
    current = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignora
    }
  },

  // Chamado pelo interceptor quando a API responde 401 para um token enviado.
  notifyExpired() {
    expiredListeners.forEach((listener) => listener())
  },

  onExpired(listener: () => void) {
    expiredListeners.add(listener)
    return () => {
      expiredListeners.delete(listener)
    }
  },
}
