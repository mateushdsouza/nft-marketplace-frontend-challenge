import { z } from 'zod'
import { CATEGORIES, NETWORKS, NFT_SORTS, NFT_TABS } from '@/shared/api/types'

const ethPattern = /^\d+(\.\d+)?$/

// O Router converte "1.5" da URL em número; coerce volta para string.
const ethParam = z.coerce.string().regex(ethPattern).optional().catch(undefined)

// Estado do catálogo na URL. Valor inválido (URL editada à mão)
// cai no padrão em vez de quebrar a página.
export const catalogSearchSchema = z.object({
  q: z.coerce.string().trim().max(80).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  network: z.enum(NETWORKS).optional().catch(undefined),
  minPrice: ethParam,
  maxPrice: ethParam,
  tab: z.enum(NFT_TABS).default('all').catch('all'),
  sort: z.enum(NFT_SORTS).default('recent').catch('recent'),
  page: z.coerce.number().int().min(1).default(1).catch(1),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const catalogSearchDefaults = {
  tab: 'all',
  sort: 'recent',
  page: 1,
} as const satisfies Partial<CatalogSearch>

export const CATALOG_PAGE_SIZE = 9
