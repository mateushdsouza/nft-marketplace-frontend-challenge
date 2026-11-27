import { SlidersHorizontal } from 'lucide-react'
import { useCallback } from 'react'
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
import { useCatalogList, useCatalogSearch } from '../use-catalog-search'
import { FiltersPanel } from './filters-panel'
import { SearchBox } from './search-box'
import { SortSelect } from './sort-select'

// Busca + botão de filtros. Abaixo de lg os filtros abrem num drawer; no
// mobile a ordenação também fica nele, como no frame do Figma.
export function CatalogToolbar({ className }: { className?: string }) {
  const { search, updateSearch, clearFilters } = useCatalogSearch()
  const { data } = useCatalogList(search)

  const commitSearchText = useCallback(
    (q: string) => updateSearch({ q: q || undefined }, true),
    [updateSearch],
  )

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-content items-center gap-3 px-6',
        className,
      )}
    >
      <SearchBox value={search.q} onCommit={commitSearchText} />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="size-12 rounded-[14px] bg-gradient-to-b from-primary/45 to-primary lg:hidden"
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
          <div className="px-4 pb-6">
            <div className="mb-6 flex flex-col gap-2 text-sm md:hidden">
              <SortSelect
                id="ordenar-filtros"
                value={search.sort}
                onChange={(sort) => updateSearch({ sort })}
              />
            </div>
            <FiltersPanel
              search={search}
              facets={data?.facets}
              onChange={(patch) => updateSearch(patch)}
              onClear={clearFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
