import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  authenticate,
  createSession,
  hashPassword,
  randomHex,
  toPublicUser,
  toSessionResponse,
} from '../auth'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'

// O backend valida por conta própria, mesmo que o front já tenha validado.
const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{3,24}$/i, 'Use 3 a 24 letras, números, ponto ou _.'),
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .regex(/[a-z]/i, 'A senha precisa ter uma letra.')
    .regex(/\d/, 'A senha precisa ter um número.'),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
})

function fieldErrorsOf(error: z.ZodError) {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0])
    result[key] ??= issue.message
  }
  return result
}

export const authHandlers = [
  http.post(
    `${API}/auth/register`,
    withNetwork(async ({ request }) => {
      const parsed = registerSchema.safeParse(
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
      const { username, email, password } = parsed.data

      if (db.state.users.some((u) => u.email === email)) {
        return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', {
          email: 'Este e-mail já está cadastrado. Tente entrar.',
        })
      }
      if (
        db.state.users.some(
          (u) => u.username.toLowerCase() === username.toLowerCase(),
        )
      ) {
        return apiError(409, 'CONFLICT', 'Nome de usuário em uso.', {
          username: 'Este nome de usuário já está em uso.',
        })
      }

      const salt = randomHex(6)
      const id = db.nextId('usr')
      db.state.users.push({
        id,
        email,
        username,
        displayName: username,
        ensName: null,
        walletNickname: null,
        avatarUrl: null,
        passwordSalt: salt,
        passwordHash: await hashPassword(salt, password),
      })
      db.state.wallets[id] = []
      db.state.favorites[id] = []
      const session = createSession(id)
      return HttpResponse.json(toSessionResponse(session), { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/login`,
    withNetwork(async ({ request }) => {
      const parsed = loginSchema.safeParse(
        await request.json().catch(() => ({})),
      )
      const user = parsed.success
        ? db.state.users.find((u) => u.email === parsed.data.email)
        : undefined
      const hash =
        user && parsed.success
          ? await hashPassword(user.passwordSalt, parsed.data.password)
          : null
      // Mesma mensagem para e-mail inexistente e senha errada:
      // não revela quais e-mails têm conta.
      if (!user || hash !== user.passwordHash) {
        return apiError(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos.')
      }
      return HttpResponse.json(toSessionResponse(createSession(user.id)))
    }),
  ),

  http.get(
    `${API}/auth/session`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      return HttpResponse.json({
        token: auth.session.token,
        user: toPublicUser(auth.user),
        expiresAt: auth.session.expiresAt,
      })
    }),
  ),

  http.post(
    `${API}/auth/logout`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (auth.ok) {
        db.state.sessions = db.state.sessions.filter(
          (s) => s.token !== auth.session.token,
        )
        db.commit()
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
