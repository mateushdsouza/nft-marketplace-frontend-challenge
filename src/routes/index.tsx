import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { Hero } from '@/features/catalog/components/hero'
import {
  MintJournal,
  Promos,
} from '@/features/catalog/components/home-sections'
import {
  catalogSearchDefaults,
  catalogSearchSchema,
} from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  // Valores padrão não aparecem na URL: "/" em vez de "/?tab=all&sort=recent&page=1".
  search: { middlewares: [stripSearchParams(catalogSearchDefaults)] },
  component: HomePage,
})

// No mobile o Figma abre com a busca e só depois o hero; no desktop o hero
// vem primeiro. A ordem do HTML segue o desktop e o mobile reordena com CSS.
function HomePage() {
  return (
    <main className="flex flex-col">
      <Hero />
      <CatalogToolbar className="mt-12 max-md:order-first max-md:mt-6 md:mt-24" />
      <CatalogSection className="mt-4 md:mt-8" />
      <Promos />
      <MintJournal />
    </main>
  )
}
