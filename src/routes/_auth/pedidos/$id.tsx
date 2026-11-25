import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/pedidos/$id')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { id } = Route.useParams()
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>
      <p>ID: {id}</p>
    </main>
  )
}
