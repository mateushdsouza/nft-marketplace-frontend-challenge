import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Hero } from '@/features/catalog/components/hero'
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

function HomePage() {
  return (
    <main>
      <Hero />
      <CatalogSection />
    </main>
  )
}
