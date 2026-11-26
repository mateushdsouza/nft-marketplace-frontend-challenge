import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { userKeys } from '@/features/auth/queries'
import { nftKeys } from '@/features/catalog/queries'
import { orderQuery } from '@/features/checkout/api'
import { clearAttempt } from '@/features/checkout/attempt'
import { QuoteSummary } from '@/features/checkout/components/quote-summary'
import { shortAddress } from '@/shared/lib/format'
import { ApiError } from '@/shared/api/errors'
import type { Order } from '@/shared/api/types'
import { NETWORK_LABEL } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/_auth/pedidos/$id')({
  // O id na URL permite recuperar o pedido depois de um refresh.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(
        orderQuery(context.user.id, params.id),
      )
    } catch (error) {
      // 404 (não existe) e 403 (é de outra pessoa) aparecem igual:
      // não revelamos que o pedido existe.
      if (error instanceof ApiError && [403, 404].includes(error.status)) {
        throw notFound()
      }
      throw error
    }
  },
  pendingMs: 150,
  pendingComponent: OrderSkeleton,
  notFoundComponent: OrderNotFound,
  errorComponent: OrderError,
  component: OrderPage,
})

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function OrderPage() {
  const { id } = Route.useParams()
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const { data: order } = useQuery(orderQuery(user.id, id))

  const status = order?.status
  // Quando o pedido termina: o carrinho e o estoque mudaram na API.
  useEffect(() => {
    if (status === 'pending' || !status) return
    clearAttempt()
    queryClient.invalidateQueries({
      queryKey: [...userKeys.all(user.id), 'cart'],
    })
    if (status === 'confirmed') {
      queryClient.invalidateQueries({ queryKey: nftKeys.all })
    }
  }, [status, queryClient, user.id])

  if (!order) return <OrderSkeleton />

  return (
    <main className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <div aria-live="polite">
        {order.status === 'pending' && <PendingState />}
        {order.status === 'rejected' && <RejectedState order={order} />}
        {order.status === 'confirmed' && <ConfirmedHeader order={order} />}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_405px]">
        <section aria-labelledby="detalhes-transacao">
          <h2
            id="detalhes-transacao"
            className="border-b border-border pb-3 text-lg font-bold"
          >
            Detalhes da transação
          </h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <Info label="Pedido" value={order.id} />
            <Info
              label="ID da transação"
              value={order.txHash ? shortAddress(order.txHash) : '—'}
            />
            <Info
              label="Data"
              value={dateFormat.format(new Date(order.createdAt))}
            />
            <Info label="Rede" value={NETWORK_LABEL[order.network]} />
            <Info
              label="Carteira"
              value={`${order.wallet.nickname} · ${shortAddress(order.wallet.address)}`}
            />
            <Info label="Comprador" value={order.buyer.displayName} />
          </dl>
          {order.explorerUrl && (
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-text-accent hover:underline"
            >
              Ver no explorador da rede (simulado)
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </section>

        <section aria-labelledby="itens-pedido">
          <h2 id="itens-pedido" className="mb-4 text-lg font-bold">
            Seus NFTs
          </h2>
          {/* Recibo: valores gravados no pedido, não lidos do catálogo. */}
          <QuoteSummary quote={{ ...order, id: order.id, expiresAt: '' }} />
        </section>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="mt-1 font-bold break-all">{value}</dd>
    </div>
  )
}

function PendingState() {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center">
      <Loader2
        className="size-10 animate-spin text-primary motion-reduce:animate-none"
        aria-hidden
      />
      <h1 className="mt-4 text-2xl font-bold">Aguardando confirmação</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        Seu pedido foi enviado e está sendo processado pela rede. Você pode
        recarregar esta página: o pedido não será duplicado.
      </p>
    </div>
  )
}

function ConfirmedHeader({ order }: { order: Order }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center">
      <CheckCircle2 className="size-12 text-success" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">
        Seus NFTs agora estão na sua carteira
      </h1>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">
        Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade
        foi transferida para sua carteira conectada e registrada na rede.
      </p>
      <Button asChild className="mt-6 rounded-button">
        <Link to="/">Continuar explorando</Link>
      </Button>
    </div>
  )
}

function RejectedState({ order }: { order: Order }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-error/60 bg-surface px-6 py-10 text-center"
    >
      <XCircle className="size-12 text-coral" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">Pagamento recusado</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        {order.failureReason} Nenhum valor foi cobrado e os itens continuam no
        seu carrinho.
      </p>
      <Button asChild className="mt-6 rounded-button">
        <Link to="/carrinho">Voltar ao carrinho</Link>
      </Button>
    </div>
  )
}

function OrderSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <span className="sr-only" role="status">
        Carregando pedido…
      </span>
      <Skeleton className="h-48 w-full rounded-card" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_405px]">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </main>
  )
}

function OrderNotFound() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <StateMessage
        title="Pedido não encontrado"
        description="Este pedido não existe ou não pertence à sua conta."
        action={
          <Button asChild className="rounded-button">
            <Link to="/">Voltar para o início</Link>
          </Button>
        }
      />
    </main>
  )
}

function OrderError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <StateMessage
        tone="error"
        title="Não foi possível carregar o pedido"
        description={
          error instanceof Error ? error.message : 'Tente novamente.'
        }
        action={
          <Button
            className="rounded-button"
            onClick={() => router.invalidate()}
          >
            Tentar novamente
          </Button>
        }
      />
    </main>
  )
}
