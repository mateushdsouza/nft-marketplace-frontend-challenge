import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { fetchQuote } from '@/features/cart/api'
import {
  currentCartKey,
  stockIssues,
  useCart,
  useCartQuote,
} from '@/features/cart/queries'
import { createOrder } from '@/features/checkout/api'
import { getAttemptKey } from '@/features/checkout/attempt'
import { sameCharges } from '@/features/checkout/quote'
import { QuoteSummary } from '@/features/checkout/components/quote-summary'
import {
  WalletPanel,
  type ConnectionStatus,
} from '@/features/checkout/components/wallet-panel'
import { shortAddress } from '@/shared/lib/format'
import {
  checkoutSchema,
  type CheckoutValues,
} from '@/features/checkout/schemas'
import {
  connectWallet,
  disconnectWallet,
  useWallets,
} from '@/features/wallets/api'
import { ApiError } from '@/shared/api/errors'
import type { Cart, Quote, User, Wallet } from '@/shared/api/types'
import { NETWORK_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { FormAlert, TextField } from '@/shared/ui/form-field'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/_auth/pagamento')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { user } = Route.useRouteContext()
  const cart = useCart()
  const wallets = useWallets()

  let content
  if (cart.isError || wallets.isError) {
    content = (
      <StateMessage
        tone="error"
        title="Não foi possível carregar o pagamento"
        description={(cart.error ?? wallets.error)?.message}
        action={
          <Button
            className="rounded-button"
            onClick={() => {
              cart.refetch()
              wallets.refetch()
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    )
  } else if (!cart.data || !wallets.data) {
    content = <CheckoutSkeleton />
  } else if (cart.data.items.length === 0) {
    content = (
      <StateMessage
        title="Seu carrinho está vazio"
        description="Adicione NFTs ao carrinho para finalizar uma compra."
        action={
          <Button asChild className="rounded-button">
            <Link to="/">Explorar NFTs</Link>
          </Button>
        }
      />
    )
  } else if (stockIssues(cart.data).length > 0) {
    content = (
      <StateMessage
        tone="error"
        title="A disponibilidade mudou"
        description="Um ou mais itens não têm mais a quantidade escolhida. Ajuste o carrinho para continuar."
        action={
          <Button asChild className="rounded-button">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        }
      />
    )
  } else {
    content = (
      <CheckoutForm user={user} cart={cart.data} wallets={wallets.data} />
    )
  }

  return (
    <main className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <nav aria-label="Trilha" className="mb-4 text-sm font-bold">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/carrinho" className="hover:text-text-accent">
              Carrinho
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>
      {content}
    </main>
  )
}

type Notice = { tone: 'error' | 'info'; text: string } | null

function CheckoutForm({
  user,
  cart,
  wallets,
}: {
  user: User
  cart: Cart
  wallets: Wallet[]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const primary = wallets.find((w) => w.slot === 'primary') ?? wallets[0]

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      note: '',
      walletId: primary?.id ?? '',
      network: primary?.network ?? 'ethereum',
    },
  })
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = form

  // Carteira e rede não são <input> do formulário: registramos à mão.
  useEffect(() => {
    register('walletId')
    register('network')
  }, [register])

  const walletId = useWatch({ control, name: 'walletId' })
  const network = useWatch({ control, name: 'network' })
  const selectedWallet = wallets.find((w) => w.id === walletId)

  const [connection, setConnection] = useState<{
    walletId: string
    status: ConnectionStatus
    message: string | null
  }>({ walletId: '', status: 'idle', message: null })
  const status: ConnectionStatus =
    connection.walletId === walletId ? connection.status : 'idle'

  const [review, setReview] = useState<{
    quote: Quote
    values: CheckoutValues
  } | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const liveQuote = useCartQuote(cart, network)

  const connect = useMutation({
    mutationFn: () => connectWallet(walletId),
    onMutate: () =>
      setConnection({ walletId, status: 'connecting', message: null }),
    onSuccess: () =>
      setConnection({ walletId, status: 'connected', message: null }),
    onError: (error) =>
      setConnection({ walletId, status: 'rejected', message: error.message }),
  })

  function disconnect(message = 'Carteira desconectada') {
    disconnectWallet(walletId).catch(() => undefined)
    setConnection({ walletId, status: 'idle', message })
    setReview(null)
  }

  const quoteForReview = useMutation({
    mutationFn: (values: CheckoutValues) =>
      fetchQuote({
        items: cart.items.map(({ nftId, editionId, quantity }) => ({
          nftId,
          editionId,
          quantity,
        })),
        couponCode: cart.couponCode ?? undefined,
        network: values.network,
      }),
  })

  const onReview = form.handleSubmit((values) => {
    setNotice(null)
    if (selectedWallet && selectedWallet.network !== values.network) return
    if (status !== 'connected') {
      setNotice({
        tone: 'error',
        text: 'Conecte a carteira para revisar o pedido.',
      })
      return
    }
    // Cotação nova no momento da revisão: é ela que o usuário confirma.
    quoteForReview.mutate(values, {
      onSuccess: (quote) => setReview({ quote, values }),
      onError: (error) => setNotice({ tone: 'error', text: error.message }),
    })
  })

  const placeOrder = useMutation({
    mutationFn: ({ quote, values }: { quote: Quote; values: CheckoutValues }) =>
      createOrder(
        {
          quoteId: quote.id,
          walletId: values.walletId,
          buyer: {
            displayName: values.displayName,
            email: values.email,
            username: values.username,
            note: values.note.trim() || null,
          },
        },
        getAttemptKey(quote.id),
      ),
  })

  function confirmPurchase() {
    // Trava contra clique duplo e contra cotação desatualizada.
    if (!review || confirmBlocked) return
    setNotice(null)
    placeOrder.mutate(review, {
      onSuccess: (order) =>
        navigate({ to: '/pedidos/$id', params: { id: order.id } }),
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          setNotice({ tone: 'error', text: 'Algo deu errado. Tente de novo.' })
          return
        }
        if (error.code === 'QUOTE_CHANGED') {
          const next = (error.details as { quote?: Quote } | null)?.quote
          if (next) {
            setNotice({
              tone: 'error',
              text: `${error.message} Total anterior: ${formatEth(review.quote.totalEth)}. Novo total: ${formatEth(next.totalEth)}.`,
            })
            setReview({ ...review, quote: next })
            // O carrinho do cache também está velho: busca de novo.
            queryClient.invalidateQueries({
              queryKey: currentCartKey(queryClient),
            })
            return
          }
        }
        if (error.code === 'WALLET_DISCONNECTED') {
          setConnection({
            walletId,
            status: 'idle',
            message: 'Carteira desconectada',
          })
          setReview(null)
          setNotice({ tone: 'error', text: error.message })
          return
        }
        if (error.isTransient) {
          setNotice({
            tone: 'error',
            text: 'Não recebemos a resposta do servidor. Confirme de novo: a mesma tentativa é reenviada, então o pedido não será duplicado.',
          })
          return
        }
        setReview(null)
        setNotice({ tone: 'error', text: error.message })
      },
    })
  }

  // Durante a revisão, o socket pode avisar que um NFT mudou. O carrinho é
  // buscado de novo e a cotação ao vivo é refeita. Se ela cobrar diferente
  // da revisada, a confirmação fica bloqueada até o comprador aceitar.
  // Só uma cotação MAIS NOVA que a revisada pode dizer que algo mudou.
  const freshQuote = liveQuote.isPlaceholderData ? undefined : liveQuote.data
  const outdated =
    !!review &&
    !!freshQuote &&
    Date.parse(freshQuote.createdAt) > Date.parse(review.quote.createdAt) &&
    !sameCharges(review.quote, freshQuote)
  const checkingQuote = !!review && liveQuote.isPlaceholderData
  const confirmBlocked = placeOrder.isPending || outdated || checkingQuote

  const displayedQuote = outdated
    ? freshQuote
    : (review?.quote ?? liveQuote.data)

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-12">
      <form id="checkout-form" onSubmit={onReview} noValidate>
        <fieldset disabled={!!review} className="space-y-5">
          <legend className="mb-4 text-lg font-bold">
            Perfil do colecionador
          </legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              id="pg-nome"
              label="Nome de exibição *"
              autoComplete="name"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <TextField
              id="pg-usuario"
              label="Nome de usuário *"
              autoComplete="username"
              spellCheck={false}
              error={errors.username?.message}
              {...register('username')}
            />
            <TextField
              id="pg-email"
              label="E-mail *"
              type="email"
              autoComplete="email"
              className="sm:col-span-2"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <div>
            <label htmlFor="pg-obs" className="mb-1.5 block text-xs font-bold">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="pg-obs"
              rows={4}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? 'pg-obs-erro' : undefined}
              className="w-full rounded-input border border-border bg-transparent px-4 py-3 text-sm focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error"
              {...register('note')}
            />
            {errors.note && (
              <p id="pg-obs-erro" className="mt-1 text-xs text-coral">
                {errors.note.message}
              </p>
            )}
          </div>
          <p className="text-xs text-text-muted">* Campos obrigatórios</p>
        </fieldset>
      </form>

      <section aria-labelledby="seus-nfts" className="space-y-6">
        <h2 id="seus-nfts" className="text-lg font-bold">
          Seus NFTs
        </h2>
        {displayedQuote ? (
          <QuoteSummary quote={displayedQuote} />
        ) : liveQuote.isError ? (
          <p role="alert" className="text-sm text-coral">
            {liveQuote.error.message}
          </p>
        ) : (
          <div aria-busy="true" className="space-y-2">
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        <WalletPanel
          wallets={wallets}
          walletId={walletId}
          network={network}
          onWalletChange={(id) => {
            const wallet = wallets.find((w) => w.id === id)
            setValue('walletId', id, { shouldValidate: true })
            if (wallet) setValue('network', wallet.network)
          }}
          onNetworkChange={(n) => setValue('network', n)}
          status={status}
          statusMessage={
            connection.walletId === walletId ? connection.message : null
          }
          onConnect={() => connect.mutate()}
          onDisconnect={() => disconnect()}
          disabled={placeOrder.isPending}
          walletError={errors.walletId?.message}
        />

        {notice && (
          <div aria-live="assertive">
            <FormAlert message={notice.text} />
          </div>
        )}

        {review ? (
          <div className="space-y-4 rounded-card border border-primary/50 p-4">
            <h3 className="font-bold">Revise antes de confirmar</h3>
            <dl className="space-y-1 text-sm text-text-secondary">
              <div>
                <dt className="inline">Comprador: </dt>
                <dd className="inline">
                  {review.values.displayName} ({review.values.email})
                </dd>
              </div>
              <div>
                <dt className="inline">Carteira: </dt>
                <dd className="inline">
                  {selectedWallet?.nickname} ·{' '}
                  {selectedWallet && shortAddress(selectedWallet.address)}
                </dd>
              </div>
              <div>
                <dt className="inline">Rede: </dt>
                <dd className="inline">
                  {NETWORK_LABEL[review.quote.network]}
                </dd>
              </div>
              <div>
                <dt className="inline">Total a pagar: </dt>
                <dd className="inline font-bold text-text-accent">
                  {formatEth(review.quote.totalEth)}
                </dd>
              </div>
            </dl>
            {outdated && freshQuote && (
              <div
                role="alert"
                className="space-y-3 rounded-input border border-error/60 bg-error/10 px-3 py-2 text-sm"
              >
                <p>
                  Os valores mudaram enquanto você revisava. Total anterior:{' '}
                  {formatEth(review.quote.totalEth)}. Novo total:{' '}
                  {formatEth(freshQuote.totalEth)}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-button"
                  onClick={() => setReview({ ...review, quote: freshQuote })}
                >
                  Revisar com o novo valor
                </Button>
              </div>
            )}
            <Button
              type="button"
              onClick={confirmPurchase}
              disabled={confirmBlocked}
              aria-disabled={confirmBlocked || undefined}
              className="h-11 w-full rounded-button font-bold"
            >
              {placeOrder.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={placeOrder.isPending}
              onClick={() => {
                setReview(null)
                setNotice(null)
              }}
              className="w-full rounded-button"
            >
              Voltar e editar
            </Button>
          </div>
        ) : (
          <Button
            type="submit"
            form="checkout-form"
            disabled={quoteForReview.isPending}
            className="h-11 w-full rounded-button font-bold"
          >
            {quoteForReview.isPending ? 'Calculando…' : 'Revisar pedido'}
          </Button>
        )}
      </section>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-12"
    >
      <span className="sr-only" role="status">
        Carregando pagamento…
      </span>
      <div className="space-y-5">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16 sm:col-span-2" />
        </div>
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-11" />
      </div>
    </div>
  )
}
