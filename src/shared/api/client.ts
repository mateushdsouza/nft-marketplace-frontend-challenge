import axios from 'axios'
import { ApiError, toApiError } from './errors'
import { guestCart } from './guest-cart'
import { sessionToken } from './session-token'

// Instância única: toda chamada REST do app passa por aqui.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Envia o token em toda requisição (≈ HttpInterceptor do Angular).
// Sem login, envia o id do carrinho de visitante.
api.interceptors.request.use((config) => {
  const token = sessionToken.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    const guestId = guestCart.get()
    if (guestId) config.headers['X-Guest-Cart'] = guestId
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = toApiError(error)
    // 401 numa requisição que levou token = a sessão acabou no servidor.
    // Login com senha errada também é 401, mas vai sem token.
    const sentToken = Boolean(error?.config?.headers?.Authorization)
    if (
      normalized instanceof ApiError &&
      normalized.status === 401 &&
      sentToken
    ) {
      sessionToken.clear()
      sessionToken.notifyExpired()
    }
    return Promise.reject(normalized)
  },
)
