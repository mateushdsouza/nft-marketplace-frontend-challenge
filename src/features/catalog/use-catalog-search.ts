import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'
import { nftListQuery } from './queries'
import { CATALOG_PAGE_SIZE, type CatalogSearch } from './search'

const route = getRouteApi('/')

// Estado do catálogo que mora na URL. Usado pela barra de busca e pela lista,
// que ficam em blocos separados da home (no mobile a busca vem antes do hero).
export function useCatalogSearch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // Qualquer mudança de filtro volta para a página 1.
  const updateSearch = useCallback(
    (patch: Partial<CatalogSearch>, replace = false) => {
      navigate({
        search: (prev) => ({ ...prev, ...patch, page: 1 }),
        resetScroll: false,
        replace,
      })
    },
    [navigate],
  )

  const clearFilters = useCallback(
    () => navigate({ search: { q: search.q }, resetScroll: false }),
    [navigate, search.q],
  )

  return { search, navigate, updateSearch, clearFilters }
}

// Mesma query key nos dois blocos: o TanStack Query faz uma requisição só.
export function useCatalogList(search: CatalogSearch) {
  return useQuery(nftListQuery({ ...search, pageSize: CATALOG_PAGE_SIZE }))
}
