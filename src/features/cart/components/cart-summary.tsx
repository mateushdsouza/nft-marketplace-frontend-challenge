import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/shared/api/errors'
import type { Cart, Network } from '@/shared/api/types'
import { NETWORK_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useApplyCoupon, useRemoveCoupon } from '../mutations'
import { stockIssues, useCartQuote } from '../queries'

const NETWORK: Network = 'ethereum'

export function CartSummary({ cart }: { cart: Cart }) {
  const quote = useCartQuote(cart, NETWORK)
  const issues = stockIssues(cart)
  const quoteError = quote.error instanceof ApiError ? quote.error : null
  const couponFailed =
    quoteError?.code === 'COUPON_EXPIRED' ||
    quoteError?.code === 'COUPON_INVALID'
  const updating = quote.isFetching && !quote.isPending

  const canCheckout =
    issues.length === 0 && !!quote.data && !quote.isError && !updating

  return (
    <section
      aria-labelledby="resumo-titulo"
      className="rounded-card bg-surface p-5 lg:bg-transparent lg:p-0"
    >
      <h2
        id="resumo-titulo"
        className="border-b border-border pb-3 text-lg font-bold"
      >
        Resumo da carteira
      </h2>

      <CouponForm appliedCode={cart.couponCode} />

      {issues.length > 0 ? (
        <p role="alert" className="mt-6 text-sm text-coral">
          A disponibilidade de{' '}
          {issues.length === 1 ? 'um item' : 'alguns itens'} mudou. Ajuste as
          quantidades para ver o total.
        </p>
      ) : couponFailed ? (
        <p role="alert" className="mt-6 text-sm text-coral">
          O cupom {cart.couponCode} não é mais válido (
          {quoteError?.message.toLowerCase()}). Remova o cupom para ver o total.
        </p>
      ) : quote.isPending ? (
        <SummarySkeleton />
      ) : quote.isError ? (
        <div role="alert" className="mt-6 text-sm">
          <p className="text-coral">
            {quoteError?.message ?? 'Não foi possível calcular o total.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-button"
            onClick={() => quote.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : quote.data ? (
        <dl
          aria-busy={updating || undefined}
          className={updating ? 'mt-6 space-y-3 opacity-60' : 'mt-6 space-y-3'}
        >
          <Row label="Subtotal" value={formatEth(quote.data.subtotalEth)} />
          <Row
            label={
              quote.data.coupon
                ? `Desconto (${quote.data.coupon.code} · ${quote.data.coupon.percentOff}%)`
                : 'Desconto do lançamento'
            }
            value={`(-) ${formatEth(quote.data.discountEth)}`}
          />
          <div>
            <Row
              label="Taxa de rede"
              value={formatEth(quote.data.networkFeeEth)}
            />
            <p className="text-right text-xs text-text-accent">
              Taxa estimada ({NETWORK_LABEL[quote.data.network]})
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <dt className="font-bold">Total</dt>
            <dd
              aria-live="polite"
              className="text-lg font-bold text-text-accent"
            >
              {formatEth(quote.data.totalEth)}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-6 space-y-3">
        {canCheckout ? (
          <Button asChild className="h-11 w-full rounded-button font-bold">
            <Link to="/pagamento">Conectar e finalizar</Link>
          </Button>
        ) : (
          <Button disabled className="h-11 w-full rounded-button font-bold">
            Conectar e finalizar
          </Button>
        )}
        <Link
          to="/"
          className="block text-center text-sm text-text-accent hover:underline"
        >
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-text-secondary">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div aria-busy="true" className="mt-6 space-y-3">
      <span className="sr-only" role="status">
        Calculando o total…
      </span>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    apply.mutate(code, {
      onSuccess: () => {
        setCode('')
        toast.success('Cupom aplicado.')
      },
      onError: (err) =>
        setError(
          err instanceof ApiError
            ? (err.fieldErrors.couponCode ?? err.message)
            : 'Não foi possível aplicar o cupom.',
        ),
    })
  }

  if (appliedCode) {
    return (
      <div className="mt-5 flex items-center justify-between rounded-input border border-primary/60 px-3 py-2 text-sm">
        <span>
          Cupom <strong className="text-text-accent">{appliedCode}</strong>{' '}
          aplicado
        </span>
        <button
          type="button"
          onClick={() =>
            remove.mutate(undefined, {
              onError: (err) => toast.error(err.message),
            })
          }
          disabled={remove.isPending}
          aria-label={`Remover cupom ${appliedCode}`}
          className="rounded-button p-1 text-text-secondary hover:text-coral"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5">
      <label htmlFor="cupom" className="mb-2 block text-sm font-bold">
        Código promocional
      </label>
      <div className="flex">
        <input
          id="cupom"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional…"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'cupom-erro' : undefined}
          className="h-10 min-w-0 flex-1 rounded-l-input border border-r-0 border-primary/60 bg-transparent px-3 text-sm uppercase placeholder:normal-case placeholder:text-secondary focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error"
        />
        <Button
          type="submit"
          disabled={apply.isPending}
          className="h-10 rounded-l-none rounded-r-input px-5 font-bold"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id="cupom-erro" role="alert" className="mt-2 text-xs text-coral">
          {error}
        </p>
      )}
    </form>
  )
}
