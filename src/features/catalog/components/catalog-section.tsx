import { NFT_TABS } from '@/shared/api/types'
import { TAB_LABEL } from '@/shared/lib/labels'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { StateMessage } from '@/shared/ui/state-message'
import { CATALOG_PAGE_SIZE } from '../search'
import { useCatalogList, useCatalogSearch } from '../use-catalog-search'
import { FiltersPanel } from './filters-panel'
import { FeaturedNft } from './home-sections'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { SortSelect } from './sort-select'

function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
}

// Abas, ordenação, filtros (lg+) e a grade. A busca fica no CatalogToolbar.
export function CatalogSection({ className }: { className?: string }) {
  const { search, navigate, updateSearch, clearFilters } = useCatalogSearch()
  const query = useCatalogList(search)
  const { data, isPending, isError, isFetching, isPlaceholderData, error } =
    query

  const showFullError = isError && (!data || isPlaceholderData)
  const refreshing = isFetching && !isPending && !showFullError

  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-titulo"
      className={cn(
        'mx-auto w-full max-w-content scroll-mt-6 px-6 md:scroll-mt-[104px]',
        className,
      )}
    >
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="grid gap-12 lg:grid-cols-[310px_1fr]">
        <div className="hidden lg:block">
          <aside aria-label="Filtros">
            <FiltersPanel
              search={search}
              facets={data?.facets}
              onChange={(patch) => updateSearch(patch)}
              onClear={clearFilters}
            />
          </aside>
          <FeaturedNft />
        </div>

        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:border-b md:border-border md:pb-3">
            <div
              role="group"
              aria-label="Listas"
              className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-x-5"
            >
              {NFT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={search.tab === tab}
                  onClick={() => updateSearch({ tab })}
                  className={cn(
                    'relative py-1 text-[13px] whitespace-nowrap transition-colors min-[400px]:text-sm',
                    search.tab === tab
                      ? 'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-primary md:after:-bottom-[13px] md:after:h-[3px]'
                      : 'text-foreground hover:text-text-accent',
                  )}
                >
                  {TAB_LABEL[tab]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm max-md:hidden">
              <SortSelect
                id="ordenar"
                value={search.sort}
                onChange={(sort) => updateSearch({ sort })}
              />
            </div>
          </div>

          <p
            aria-live="polite"
            className="mt-4 min-h-5 text-xs text-text-muted max-md:sr-only"
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
                className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12 md:pb-0 max-md:[&>*:nth-child(even)]:translate-y-8"
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
                    'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 transition-opacity md:grid-cols-3 md:gap-x-8 md:gap-y-12 md:pb-0',
                    refreshing && 'opacity-60',
                  )}
                >
                  {data.items.map((nft, index) => (
                    <li key={nft.id} className="max-md:even:translate-y-8">
                      <NftCard nft={nft} priority={index < 3} />
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
