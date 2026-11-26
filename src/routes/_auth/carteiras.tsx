import { createFileRoute, Link } from '@tanstack/react-router'
import { useWallets } from '@/features/wallets/api'
import { WalletSlot } from '@/features/wallets/components/wallet-slot'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/_auth/carteiras')({
  component: WalletPage,
})

function WalletPage() {
  const wallets = useWallets()

  return (
    <main className="mx-auto max-w-3xl px-6 pt-6 pb-16 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Minhas carteiras</h1>
        <Link
          to="/perfil"
          className="text-sm font-bold text-text-accent hover:underline"
        >
          Meu perfil
        </Link>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        As carteiras cadastradas aparecem no pagamento. A conexão é simulada.
      </p>

      {wallets.isPending ? (
        <div aria-busy="true" className="mt-6 space-y-6">
          <span className="sr-only">Carregando carteiras…</span>
          <Skeleton className="h-[164px] w-full" />
          <Skeleton className="h-[164px] w-full" />
        </div>
      ) : wallets.isError ? (
        <StateMessage
          tone="error"
          className="mt-6"
          title="Não foi possível carregar as carteiras"
          description={wallets.error.message}
          action={
            <Button
              className="rounded-button"
              onClick={() => wallets.refetch()}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <div className="mt-6 space-y-6">
          <WalletSlot
            slot="primary"
            wallet={wallets.data.find((w) => w.slot === 'primary')}
          />
          <WalletSlot
            slot="secondary"
            wallet={wallets.data.find((w) => w.slot === 'secondary')}
          />
        </div>
      )}
    </main>
  )
}
