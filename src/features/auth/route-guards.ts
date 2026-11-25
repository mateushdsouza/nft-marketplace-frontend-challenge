import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { safeRedirect, sessionQuery } from './queries'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

// Quem já está logado não precisa ver login/cadastro.
export async function redirectIfAuthenticated(
  queryClient: QueryClient,
  target: string | undefined,
) {
  const session = await queryClient.ensureQueryData(sessionQuery())
  if (session) throw redirect({ href: safeRedirect(target) ?? '/' })
}
