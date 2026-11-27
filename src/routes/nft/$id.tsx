import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Link2, ShoppingCart, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAddToCart } from '@/features/cart/mutations'
import { nftDetailQuery } from '@/features/catalog/queries'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { EditionPicker } from '@/features/nft-detail/components/edition-picker'
import { NftGallery } from '@/features/nft-detail/components/nft-gallery'
import { RelatedNfts } from '@/features/nft-detail/components/related-nfts'
import { ApiError } from '@/shared/api/errors'
import type { Nft } from '@/shared/api/types'
import { CATEGORY_LABEL, NETWORK_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/nft/$id')({
  // Busca antes de renderizar: acesso direto pela URL já chega com os dados
  // (ou com o 404), e o cache do Query é reaproveitado na navegação.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(nftDetailQuery(params.id))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }
  },
  pendingMs: 150,
  pendingComponent: NftDetailSkeleton,
  notFoundComponent: NftNotFound,
  errorComponent: NftDetailError,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { id } = Route.useParams()
  const { data: nft } = useSuspenseQuery(nftDetailQuery(id))

  return (
    <main className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <nav aria-label="Trilha" className="mb-4 text-sm font-bold">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,573px)_minmax(0,1fr)]">
        <NftGallery image={nft.image} name={nft.name} />
        <NftInfo key={nft.id} nft={nft} />
      </div>

      <section aria-labelledby="detalhes" className="mt-16">
        <h2
          id="detalhes"
          className="border-b border-border pb-3 text-base font-bold text-text-accent"
        >
          Detalhes do NFT
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-6 text-text-secondary">
          <p>
            {nft.name} é uma obra digital da coleção {nft.collection}, na
            categoria {CATEGORY_LABEL[nft.category].toLowerCase()}. Cada
            atributo fica armazenado nos metadados do token e é verificado na{' '}
            {NETWORK_LABEL[nft.network]}.
          </p>
          <dl className="grid gap-3">
            <div>
              <dt className="font-bold text-foreground">Rede:</dt>
              <dd>{NETWORK_LABEL[nft.network]}</dd>
            </div>
            <div>
              <dt className="font-bold text-foreground">Disponibilidade:</dt>
              <dd>
                {nft.editions
                  .map(
                    (e) =>
                      `${e.kind === 'aberta' ? 'Aberta' : e.kind}: ${e.available === 0 ? 'esgotada' : `${e.available} disponíveis`}`,
                  )
                  .join(' · ')}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <RelatedNfts nft={nft} />
    </main>
  )
}

function NftInfo({ nft }: { nft: Nft }) {
  const firstAvailable = nft.editions.find((e) => e.available > 0)
  const [editionId, setEditionId] = useState<string | null>(
    firstAvailable?.id ?? null,
  )
  const [quantity, setQuantity] = useState(1)

  const edition = nft.editions.find((e) => e.id === editionId)
  const available = edition?.available ?? 0
  // Se o estoque cair depois da escolha (evento em tempo real),
  // a quantidade nunca passa do disponível.
  const qty = Math.min(quantity, Math.max(available, 1))
  const canBuy = available > 0
  const addToCart = useAddToCart()
  const navigate = useNavigate()

  function handleAdd(goToCart: boolean) {
    if (!editionId) return
    addToCart.mutate(
      { nftId: nft.id, editionId, quantity: qty },
      {
        onSuccess: () => {
          if (goToCart) {
            navigate({ to: '/carrinho' })
            return
          }
          toast.success(`${nft.name} adicionado ao carrinho.`, {
            action: {
              label: 'Ver carrinho',
              onClick: () => navigate({ to: '/carrinho' }),
            },
          })
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function selectEdition(id: string) {
    setEditionId(id)
    setQuantity(1)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link do NFT copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <div className="rounded-art bg-surface p-5 lg:bg-transparent lg:p-0">
      <h1 className="text-2xl font-bold md:text-[28px]">{nft.name}</h1>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-[22px] font-bold text-text-accent">
          {formatEth(nft.priceEth)}
          {nft.previousPriceEth && (
            <span className="ml-3 text-sm font-normal text-secondary">
              <span className="sr-only">Preço anterior: </span>
              <s>{formatEth(nft.previousPriceEth)}</s>
            </span>
          )}
        </p>
        <p className="flex items-center gap-1 text-sm">
          <span className="flex" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={
                  i < nft.rating
                    ? 'size-4 fill-amber text-amber'
                    : 'size-4 text-border-soft'
                }
              />
            ))}
          </span>
          <span className="sr-only">Nota {nft.rating} de 5, </span>
          {nft.reviewCount} avaliações de colecionadores
        </p>
      </div>

      <h2 className="mt-5 text-sm font-bold">Sobre este NFT:</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {nft.description}
      </p>

      <div className="mt-5">
        <EditionPicker
          editions={nft.editions}
          value={editionId}
          onChange={selectEdition}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <QuantityStepper
            value={qty}
            max={Math.max(available, 1)}
            onChange={setQuantity}
            disabled={!canBuy}
          />
          <p className="mt-2 text-xs text-text-muted" aria-live="polite">
            {canBuy
              ? `${available} ${available === 1 ? 'disponível' : 'disponíveis'} nesta edição`
              : 'Todas as edições estão esgotadas'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="h-10 rounded-button px-8 font-bold uppercase"
            disabled={!canBuy || addToCart.isPending}
            onClick={() => handleAdd(true)}
          >
            Comprar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-button"
            aria-label="Adicionar ao carrinho"
            disabled={!canBuy || addToCart.isPending}
            onClick={() => handleAdd(false)}
          >
            <ShoppingCart aria-hidden />
          </Button>
          <FavoriteButton nftId={nft.id} nftName={nft.name} />
        </div>
      </div>

      <dl className="mt-6 space-y-2 text-sm text-text-secondary">
        <div className="flex gap-2">
          <dt>ID do token:</dt>
          <dd>{nft.tokenId}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Coleção:</dt>
          <dd>{nft.collection}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(', ')}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={copyLink}
        className="mt-4 inline-flex items-center gap-2 text-sm font-bold hover:text-text-accent"
      >
        <Link2 className="size-4" aria-hidden />
        Compartilhar este NFT (copiar link)
      </button>
    </div>
  )
}

function NftDetailSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-content px-6 pt-6 md:pt-10">
      <p className="sr-only" role="status">
        Carregando NFT…
      </p>
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,573px)_minmax(0,1fr)]">
        <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start">
          <div className="flex gap-3 md:flex-col md:gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton
                key={i}
                className="size-16 rounded-card md:size-[100px]"
              />
            ))}
          </div>
          <Skeleton className="aspect-square flex-1 rounded-card" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
    </main>
  )
}

function NftNotFound() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <StateMessage
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do marketplace."
        action={
          <Button asChild className="rounded-button">
            <Link to="/">Explorar o catálogo</Link>
          </Button>
        }
      />
    </main>
  )
}

function NftDetailError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <StateMessage
        tone="error"
        title="Não foi possível carregar este NFT"
        description={
          error instanceof Error
            ? error.message
            : 'Tente novamente em instantes.'
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
