import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <p className="text-sm font-bold tracking-[0.1em]">KURIO</p>
      <h1 className="mt-8 text-[43px] leading-tight font-bold uppercase">
        Seja dono do futuro da arte digital
      </h1>
      <p className="mt-4 text-text-secondary">Em construção.</p>
      <p className="mt-8 text-lg font-bold text-text-accent">1.19 ETH</p>
      <Button className="mt-8">Explorar</Button>
    </main>
  )
}
