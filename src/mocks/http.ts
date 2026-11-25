import {
  delay,
  HttpResponse,
  type DefaultBodyType,
  type HttpResponseResolver,
  type PathParams,
} from 'msw'
import type { ApiErrorCode } from '@/shared/api/types'
import { scenario } from './scenarios'

export const API = '/api'

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  return HttpResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  )
}

// Envolve um handler com a latência e as falhas do cenário ativo.
export function withNetwork<
  Params extends PathParams,
  Body extends DefaultBodyType,
>(
  resolver: HttpResponseResolver<Params, Body>,
): HttpResponseResolver<Params, Body> {
  return async (info) => {
    await delay(scenario.latencyMs())
    const failure = scenario.failure()
    if (failure) return failure
    return resolver(info)
  }
}
