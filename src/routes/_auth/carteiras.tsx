import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/carteiras')({
  component: WalletPage,
})

function WalletPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Minhas carteiras</h1>
    </main>
  )
}
