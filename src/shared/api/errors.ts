import axios from 'axios'
import type { ApiErrorBody, ApiErrorCode } from './types'

// Todo erro da API chega aos componentes neste formato,
// independente de ter sido HTTP 4xx/5xx, timeout ou queda de conexão.
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors: Record<string, string>
  // Dados extras do erro (ex.: a cotação nova num 409 QUOTE_CHANGED).
  readonly details: unknown

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors: Record<string, string> = {},
    details: unknown = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }

  // Falhas que vale a pena repetir automaticamente.
  get isTransient(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code === 'TIMEOUT' ||
      this.status === 503
    )
  }
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorBody).error?.code === 'string'
  )
}

export function toApiError(error: unknown): unknown {
  if (axios.isCancel(error)) return error
  if (!axios.isAxiosError(error)) return error

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError(
      0,
      'TIMEOUT',
      'O servidor demorou para responder. Tente novamente.',
    )
  }

  const response = error.response
  if (!response) {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Sem conexão com o servidor. Verifique sua internet.',
    )
  }

  if (isErrorBody(response.data)) {
    const { code, message, fieldErrors, details } = response.data.error
    return new ApiError(response.status, code, message, fieldErrors, details)
  }

  return new ApiError(
    response.status,
    response.status === 503 ? 'SERVICE_UNAVAILABLE' : 'UNKNOWN',
    'Algo deu errado. Tente novamente.',
  )
}
