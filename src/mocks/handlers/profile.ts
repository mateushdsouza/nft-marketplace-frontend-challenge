import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { authenticate, hashPassword, randomHex, toPublicUser } from '../auth'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'

// O backend valida por conta própria, mesmo que o front já tenha validado.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .nullable()
    .transform((v) => v || null)

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(60, 'Use no máximo 60 caracteres.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{3,24}$/i, 'Use 3 a 24 letras, números, ponto ou _.'),
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  ensName: optionalText(40),
  walletNickname: optionalText(40),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Digite a senha atual.'),
  newPassword: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .regex(/[a-z]/i, 'A senha precisa ter uma letra.')
    .regex(/\d/, 'A senha precisa ter um número.'),
})

// O avatar chega como data URL (data:image/png;base64,...). O "banco" do mock
// mora no localStorage, que tem pouco espaço, por isso o limite de 1 MB.
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_MAX_BYTES = 1024 * 1024

const avatarSchema = z.object({ dataUrl: z.string() })

function parseDataUrl(value: string) {
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) return null
  const [, type, base64] = match
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return { type, bytes: (base64.length * 3) / 4 - padding }
}

function fieldErrorsOf(error: z.ZodError) {
  const result: Record<string, string> = {}
  for (const issue of error.issues)
    result[String(issue.path[0])] ??= issue.message
  return result
}

export const profileHandlers = [
  http.get(
    `${API}/profile`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      return HttpResponse.json(toPublicUser(auth.user))
    }),
  ),

  http.patch(
    `${API}/profile`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const parsed = profileSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      if (!parsed.success) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Confira os campos destacados.',
          fieldErrorsOf(parsed.error),
        )
      }
      const others = db.state.users.filter((u) => u.id !== auth.user.id)
      if (others.some((u) => u.email === parsed.data.email)) {
        return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', {
          email: 'Este e-mail já está em uso por outra conta.',
        })
      }
      const username = parsed.data.username.toLowerCase()
      if (others.some((u) => u.username.toLowerCase() === username)) {
        return apiError(409, 'CONFLICT', 'Este nome de usuário já existe.', {
          username: 'Este nome de usuário já existe.',
        })
      }
      Object.assign(auth.user, parsed.data)
      db.commit()
      return HttpResponse.json(toPublicUser(auth.user))
    }),
  ),

  http.post(
    `${API}/profile/avatar`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const parsed = avatarSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      const file = parsed.success ? parseDataUrl(parsed.data.dataUrl) : null
      if (!parsed.success || !file) {
        return apiError(422, 'VALIDATION_ERROR', 'Imagem inválida.', {
          avatar: 'Não foi possível ler a imagem.',
        })
      }
      if (!AVATAR_TYPES.includes(file.type)) {
        return apiError(422, 'VALIDATION_ERROR', 'Formato não aceito.', {
          avatar: 'Use uma imagem PNG, JPG ou WebP.',
        })
      }
      if (file.bytes > AVATAR_MAX_BYTES) {
        return apiError(422, 'VALIDATION_ERROR', 'Imagem grande demais.', {
          avatar: 'A imagem deve ter no máximo 1 MB.',
        })
      }
      auth.user.avatarUrl = parsed.data.dataUrl
      db.commit()
      return HttpResponse.json(toPublicUser(auth.user))
    }),
  ),

  http.delete(
    `${API}/profile/avatar`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      auth.user.avatarUrl = null
      db.commit()
      return HttpResponse.json(toPublicUser(auth.user))
    }),
  ),

  http.post(
    `${API}/profile/password`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const parsed = passwordSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      if (!parsed.success) {
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Confira os campos destacados.',
          fieldErrorsOf(parsed.error),
        )
      }
      const { currentPassword, newPassword } = parsed.data
      const currentHash = await hashPassword(
        auth.user.passwordSalt,
        currentPassword,
      )
      if (currentHash !== auth.user.passwordHash) {
        return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', {
          currentPassword: 'Senha atual incorreta.',
        })
      }
      if (currentPassword === newPassword) {
        return apiError(422, 'VALIDATION_ERROR', 'Escolha uma senha nova.', {
          newPassword: 'A nova senha precisa ser diferente da atual.',
        })
      }
      // Sal novo a cada troca; a senha nunca é guardada em texto claro.
      auth.user.passwordSalt = randomHex(6)
      auth.user.passwordHash = await hashPassword(
        auth.user.passwordSalt,
        newPassword,
      )
      db.commit()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
