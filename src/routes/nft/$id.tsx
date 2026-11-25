import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$id')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { id } = Route.useParams()
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Detalhes do NFT</h1>
      <p>ID: {id}</p>
    </main>
  )
}
