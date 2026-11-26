import type {
  CartItemInput,
  Nft,
  Order,
  Quote,
  Wallet,
} from '@/shared/api/types'
import { createCouponFixtures, type CouponRecord } from './fixtures/coupons'
import { createNftFixtures } from './fixtures/nfts'
import {
  createUserFixtures,
  createWalletFixtures,
  type UserRecord,
} from './fixtures/users'

// "Banco" único do backend falso. Todos os handlers leem e escrevem aqui,
// então catálogo, carrinho, pedidos e eventos ficam sempre coerentes.

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface CartRecord {
  items: Array<CartItemInput & { id: string }>
  couponCode?: string | null
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  ownerId: string
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  requestHash: string
}

export interface DbState {
  schema: number
  nfts: Nft[]
  users: UserRecord[]
  sessions: SessionRecord[]
  // chave: id do usuário ou id do carrinho de visitante (guest_...)
  carts: Record<string, CartRecord>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  coupons: CouponRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  sequence: number
}

const STORAGE_KEY = 'kurio:mock-db'
const SCHEMA = 1

function seed(): DbState {
  return {
    schema: SCHEMA,
    nfts: createNftFixtures(),
    users: createUserFixtures(),
    sessions: [],
    carts: {},
    favorites: { usr_alice: ['nft_003'], usr_bob: [] },
    wallets: createWalletFixtures(),
    coupons: createCouponFixtures(),
    quotes: [],
    orders: [],
    sequence: 1000,
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === SCHEMA) return parsed
    }
  } catch {
    // localStorage indisponível ou JSON inválido: volta ao cenário padrão
  }
  return seed()
}

let state: DbState = load()

export const db = {
  get state(): DbState {
    return state
  },

  // Grava o estado atual. Os handlers chamam depois de cada escrita.
  commit() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // sem persistência, mas o estado em memória continua válido
    }
  },

  reset() {
    state = seed()
    this.commit()
  },

  nextId(prefix: string): string {
    state.sequence += 1
    return `${prefix}_${state.sequence}`
  },
}
