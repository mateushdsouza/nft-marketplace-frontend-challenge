import axios from 'axios'
import { toApiError } from './errors'

// Instância única: toda chamada REST do app passa por aqui.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)
