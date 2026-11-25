import Decimal from 'decimal.js'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  CATEGORIES,
  NETWORKS,
  NFT_SORTS,
  NFT_TABS,
  type FacetCount,
  type Nft,
  type NftListResponse,
} from '@/shared/api/types'
import { db } from '../db'
import { API, apiError, withNetwork } from '../http'
import { scenario } from '../scenarios'

const CATEGORY_VALUES = CATEGORIES
const NETWORK_VALUES = NETWORKS

const ethString = z.string().regex(/^\d+(\.\d+)?$/, 'Valor em ETH inválido')

const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  network: z.enum(NETWORK_VALUES).optional(),
  minPrice: ethString.optional(),
  maxPrice: ethString.optional(),
  tab: z.enum(NFT_TABS).default('all'),
  sort: z.enum(NFT_SORTS).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(9),
})

type ListQuery = z.infer<typeof listQuerySchema>

function matches(nft: Nft, query: ListQuery, skip?: 'category' | 'network') {
  if (query.q) {
    const term = query.q.toLowerCase()
    const text = `${nft.name} ${nft.collection} ${nft.tokenId}`.toLowerCase()
    if (!text.includes(term)) return false
  }
  if (skip !== 'category' && query.category && nft.category !== query.category)
    return false
  if (skip !== 'network' && query.network && nft.network !== query.network)
    return false
  if (query.minPrice && new Decimal(nft.priceEth).lt(query.minPrice))
    return false
  if (query.maxPrice && new Decimal(nft.priceEth).gt(query.maxPrice))
    return false
  if (query.tab === 'new' && !nft.isNew) return false
  if (query.tab === 'trending' && !nft.trending) return false
  return true
}

function countBy<T extends string>(
  items: Nft[],
  values: readonly T[],
  key: (nft: Nft) => T,
): FacetCount<T>[] {
  return values.map((value) => ({
    value,
    count: items.filter((nft) => key(nft) === value).length,
  }))
}

function sortNfts(items: Nft[], sort: ListQuery['sort']): Nft[] {
  const copy = [...items]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => new Decimal(a.priceEth).comparedTo(b.priceEth))
    case 'price-desc':
      return copy.sort((a, b) => new Decimal(b.priceEth).comparedTo(a.priceEth))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export const nftHandlers = [
  http.get(
    `${API}/nfts`,
    withNetwork(({ request }) => {
      const url = new URL(request.url)
      const parsed = listQuerySchema.safeParse(
        Object.fromEntries(url.searchParams),
      )
      if (!parsed.success) {
        const fieldErrors = Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        )
        return apiError(
          422,
          'VALIDATION_ERROR',
          'Parâmetros inválidos.',
          fieldErrors,
        )
      }
      const query = parsed.data
      const all = scenario.name === 'catalog-empty' ? [] : db.state.nfts

      const filtered = sortNfts(
        all.filter((nft) => matches(nft, query)),
        query.sort,
      )
      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
      const start = (query.page - 1) * query.pageSize
      const prices = all.map((n) => new Decimal(n.priceEth))

      const body: NftListResponse = {
        items: filtered.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
        facets: {
          categories: countBy(
            all.filter((n) => matches(n, query, 'category')),
            CATEGORY_VALUES,
            (n) => n.category,
          ),
          networks: countBy(
            all.filter((n) => matches(n, query, 'network')),
            NETWORK_VALUES,
            (n) => n.network,
          ),
        },
        priceRange: {
          min: prices.length ? Decimal.min(...prices).toString() : '0',
          max: prices.length ? Decimal.max(...prices).toString() : '0',
        },
      }
      return HttpResponse.json(body)
    }),
  ),

  http.get(
    `${API}/nfts/:id`,
    withNetwork(({ params }) => {
      const nft = db.state.nfts.find((n) => n.id === params.id)
      if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      return HttpResponse.json(nft)
    }),
  ),
]
