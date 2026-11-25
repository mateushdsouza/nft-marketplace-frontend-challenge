import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/shared/api/errors'

// Leva os erros por campo da API (422/409) para os campos do formulário.
// Devolve a mensagem geral para mostrar num alerta acima do formulário.
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string {
  if (!(error instanceof ApiError)) return 'Algo deu errado. Tente novamente.'
  let mappedAny = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message })
      mappedAny = true
    }
  }
  if (mappedAny && error.status === 422) return 'Confira os campos destacados.'
  return error.message
}
