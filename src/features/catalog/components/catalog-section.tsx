import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useCallback } from 'react'
import { NFT_SORTS, NFT_TABS, type NftSort } from '@/shared/api/types'
import { SORT_LABEL, TAB_LABEL } from '@/shared/lib/labels'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'
import { StateMessage } from '@/shared/ui/state-message'
import { nftListQuery } from '../queries'
import { CATALOG_PAGE_SIZE, type CatalogSearch } from '../search'
import { FiltersPanel } from './filters-panel'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { SearchBox } from './search-box'

const route = getRouteApi('/')

function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
}

export function CatalogSection() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const query = useQuery(
    nftListQuery({ ...search, pageSize: CATALOG_PAGE_SIZE }),
  )
  const { data, isPending, isError, isFetching, isPlaceholderData, error } =
    query

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

  const commitSearchText = useCallback(
    (q: string) => updateSearch({ q: q || undefined }, true),
    [updateSearch],
  )

  const clearFilters = () =>
    navigate({ search: { q: search.q }, resetScroll: false })

  const showFullError = isError && (!data || isPlaceholderData)
  const refreshing = isFetching && !isPending && !showFullError

  const filters = (
    <FiltersPanel
      search={search}
      facets={data?.facets}
      onChange={(patch) => updateSearch(patch)}
      onClear={clearFilters}
    />
  )

  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-titulo"
      className="mx-auto mt-12 max-w-content scroll-mt-6 px-6 md:mt-24"
    >
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="flex items-center gap-3">
        <SearchBox value={search.q} onCommit={commitSearchText} />
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="size-12 rounded-card lg:hidden"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="size-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Os resultados atualizam a cada filtro escolhido.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{filters}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[310px_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">
          {filters}
        </aside>

        <div>
          <div className="flex flex-col gap-4 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Listas"
              className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-5"
            >
              {NFT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={search.tab === tab}
                  onClick={() => updateSearch({ tab })}
                  className={cn(
                    'relative py-1 text-[13px] whitespace-nowrap transition-colors sm:text-sm',
                    search.tab === tab
                      ? 'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-[13px] after:h-[3px] after:bg-primary'
                      : 'text-foreground hover:text-text-accent',
                  )}
                >
                  {TAB_LABEL[tab]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="ordenar" className="shrink-0">
                Ordenar por:
              </label>
              <select
                id="ordenar"
                value={search.sort}
                onChange={(e) =>
                  updateSearch({ sort: e.target.value as NftSort })
                }
                className="h-9 rounded-input border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
              >
                {NFT_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {SORT_LABEL[sort]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p
            aria-live="polite"
            className="mt-4 min-h-5 text-xs text-text-muted"
          >
            {isPending
              ? 'Carregando NFTs…'
              : refreshing
                ? 'Atualizando resultados…'
                : data && !showFullError
                  ? `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`
                  : ''}
          </p>

          <div className="mt-4">
            {isPending ? (
              <div
                aria-busy="true"
                className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-12"
              >
                {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </div>
            ) : showFullError ? (
              <StateMessage
                tone="error"
                title="Não foi possível carregar os NFTs"
                description={error?.message}
                action={
                  <Button
                    onClick={() => query.refetch()}
                    className="rounded-button"
                  >
                    Tentar novamente
                  </Button>
                }
              />
            ) : data && data.items.length === 0 ? (
              <StateMessage
                title="Nenhum NFT encontrado"
                description="Tente outro termo de busca ou remova alguns filtros."
                action={
                  <Button
                    variant="outline"
                    className="rounded-button"
                    onClick={() => navigate({ search: {}, resetScroll: false })}
                  >
                    Limpar busca e filtros
                  </Button>
                }
              />
            ) : data ? (
              <>
                {isError && (
                  <p role="alert" className="mb-4 text-sm text-coral">
                    Não foi possível atualizar a lista.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => query.refetch()}
                    >
                      Tentar novamente
                    </button>
                  </p>
                )}
                <ul
                  aria-busy={refreshing}
                  className={cn(
                    'grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-8 md:gap-y-12',
                    refreshing && 'opacity-60',
                  )}
                >
                  {data.items.map((nft) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} />
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={search.page}
                  totalPages={data.totalPages}
                  onNavigate={scrollToCatalog}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
