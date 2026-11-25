import type { Session, User } from '@/shared/api/types'
import { db, type SessionRecord } from './db'
import type { UserRecord } from './fixtures/users'
import { apiError } from './http'

export const SESSION_TTL_MS = 30 * 60_000

export function randomHex(bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(values, (b) => b.toString(16).padStart(2, '0')).join('')
}

// sha256(salt + ":" + senha) em hexadecimal. A senha nunca é guardada.
export async function hashPassword(salt: string, password: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

export function toPublicUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    username: record.username,
    ensName: record.ensName,
    walletNickname: record.walletNickname,
    avatarUrl: record.avatarUrl,
  }
}

export function createSession(userId: string): SessionRecord {
  const session: SessionRecord = {
    token: `tok_${randomHex(24)}`,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db.state.sessions.push(session)
  db.commit()
  return session
}

export function toSessionResponse(session: SessionRecord): Session {
  const user = db.state.users.find((u) => u.id === session.userId)!
  return {
    token: session.token,
    user: toPublicUser(user),
    expiresAt: session.expiresAt,
  }
}

function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

type AuthResult =
  | { ok: true; user: UserRecord; session: SessionRecord }
  | { ok: false; response: Response }

// Equivalente a um filtro de segurança: valida o token de cada requisição.
export function authenticate(request: Request): AuthResult {
  const token = readToken(request)
  if (!token) {
    return {
      ok: false,
      response: apiError(401, 'UNAUTHORIZED', 'Faça login para continuar.'),
    }
  }
  const session = db.state.sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return {
      ok: false,
      response: apiError(
        401,
        'SESSION_EXPIRED',
        'Sua sessão expirou. Entre novamente.',
      ),
    }
  }
  const user = db.state.users.find((u) => u.id === session.userId)
  if (!user) {
    return {
      ok: false,
      response: apiError(401, 'UNAUTHORIZED', 'Faça login para continuar.'),
    }
  }
  return { ok: true, user, session }
}

export function optionalUser(request: Request): UserRecord | null {
  const result = authenticate(request)
  return result.ok ? result.user : null
}
