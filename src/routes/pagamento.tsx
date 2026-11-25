import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pagamento')({
  component: PaymentPage,
})

function PaymentPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Pagamento</h1>
    </main>
  )
}
