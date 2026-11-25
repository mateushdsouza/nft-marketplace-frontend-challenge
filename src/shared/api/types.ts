// Contratos da API REST. Os handlers do MSW e o front usam os mesmos tipos.
// Valores em ETH trafegam sempre como string decimal ("0.125"), nunca number.

export type EthAmount = string

export type Network = 'ethereum' | 'polygon' | 'solana'

export type Category =
  | 'arte-digital'
  | 'fotografia'
  | 'musica'
  | 'arte-3d'
  | 'colecionaveis'
  | 'generativa'
  | 'jogos'
  | 'assinaturas'
  | 'utilidade'

export type EditionKind = '1/1' | '1/10' | '1/50' | 'aberta'

export interface NftEdition {
  id: string
  kind: EditionKind
  available: number
}

export interface Nft {
  id: string
  tokenId: string
  name: string
  collection: string
  category: Category
  network: Network
  image: string
  priceEth: EthAmount
  previousPriceEth: EthAmount | null
  description: string
  attributes: string[]
  rating: number
  reviewCount: number
  editions: NftEdition[]
  isNew: boolean
  trending: boolean
  createdAt: string
  version: number
}

export type NftSort = 'recent' | 'price-asc' | 'price-desc' | 'name'
export type NftTab = 'all' | 'new' | 'trending'

export interface NftListParams {
  q?: string
  category?: Category
  network?: Network
  minPrice?: EthAmount
  maxPrice?: EthAmount
  tab?: NftTab
  sort?: NftSort
  page?: number
  pageSize?: number
}

export interface FacetCount<T extends string> {
  value: T
  count: number
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface NftListResponse extends Page<Nft> {
  facets: {
    categories: FacetCount<Category>[]
    networks: FacetCount<Network>[]
  }
  priceRange: { min: EthAmount; max: EthAmount }
}

// Conta e sessão

export interface User {
  id: string
  email: string
  displayName: string
  username: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
}

export interface Session {
  token: string
  user: User
  expiresAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  username: string
  email: string
  password: string
}

export interface ProfileUpdate {
  displayName: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string | null
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
}

// Carrinho e cotação

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  nft: Pick<Nft, 'id' | 'name' | 'tokenId' | 'image' | 'priceEth' | 'version'>
  edition: NftEdition
  lineTotalEth: EthAmount
}

export interface Cart {
  items: CartItem[]
  subtotalEth: EthAmount
  updatedAt: string
}

export interface CartItemInput {
  nftId: string
  editionId: string
  quantity: number
}

export interface QuoteRequest {
  items: CartItemInput[]
  couponCode?: string
  network: Network
}

export interface QuoteLine extends CartItemInput {
  name: string
  tokenId: string
  image: string
  editionKind: EditionKind
  unitPriceEth: EthAmount
  lineTotalEth: EthAmount
}

export interface Coupon {
  code: string
  percentOff: number
}

export interface Quote {
  id: string
  items: QuoteLine[]
  coupon: Coupon | null
  network: Network
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  createdAt: string
  expiresAt: string
}

// Carteiras

export type WalletSlot = 'primary' | 'secondary'
export type WalletProvider = 'metamask' | 'coinbase' | 'walletconnect'

export interface Wallet {
  id: string
  slot: WalletSlot
  nickname: string
  network: Network
  address: string
  provider: WalletProvider
  ensName: string | null
}

export type WalletInput = Omit<Wallet, 'id'>

// Pedidos

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface BuyerInfo {
  displayName: string
  email: string
  username: string
  note: string | null
}

export interface CreateOrderRequest {
  quoteId: string
  walletId: string
  buyer: BuyerInfo
}

export interface Order {
  id: string
  status: OrderStatus
  items: QuoteLine[]
  coupon: Coupon | null
  network: Network
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  wallet: Pick<Wallet, 'id' | 'nickname' | 'address' | 'provider'>
  buyer: BuyerInfo
  txHash: string | null
  explorerUrl: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
  version: number
}

// Erros

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMAIL_TAKEN'
  | 'OUT_OF_STOCK'
  | 'QUOTE_CHANGED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string>
  }
}
