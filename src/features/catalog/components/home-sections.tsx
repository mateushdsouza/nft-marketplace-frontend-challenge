import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { comingSoon } from '@/shared/lib/coming-soon'

// Blocos fixos da home desenhados no Figma: NFT em destaque (abaixo dos
// filtros), as duas promoções e o "Diário da Cunhagem". Os botões levam a
// telas reais do catálogo; os artigos do diário são conteúdo editorial, fora
// do escopo, e avisam isso.

export function FeaturedNft() {
  return (
    <Link
      to="/nft/$id"
      params={{ id: 'nft_002' }}
      className="mt-6 block rounded-card bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1 text-center hover:from-primary/15"
    >
      <p className="text-2xl font-bold text-text-accent">NFT EM DESTAQUE</p>
      <p className="mt-4 text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      <img
        src="/nfts/nft-02.webp"
        alt="Sage Nomad #009, gorila de chapéu verde e moletom roxo"
        width={310}
        height={368}
        loading="lazy"
        decoding="async"
        className="mt-4 aspect-[310/368] w-full rounded-[22px] object-cover"
      />
    </Link>
  )
}

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/nfts/nft-01.webp',
    alt: 'Emerald Ape, macaco de óculos escuros e jaqueta verde',
    search: { tab: 'new' as const },
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/nfts/nft-03.webp',
    alt: 'Ivory Baron, gorila de terno claro e gola alta',
    search: { category: 'arte-digital' as const },
  },
]

export function Promos() {
  return (
    <section
      aria-label="Promoções"
      className="mx-auto mt-24 grid max-w-content gap-7 px-6 md:grid-cols-2"
    >
      {PROMOS.map((promo) => (
        <article
          key={promo.image}
          className="relative grid min-h-[250px] grid-cols-[1fr_1.05fr] overflow-hidden rounded-card bg-surface"
        >
          <img
            src={promo.image}
            alt={promo.alt}
            width={292}
            height={250}
            loading="lazy"
            decoding="async"
            className="h-full w-full rounded-[18px] object-cover"
          />
          <div className="flex flex-col items-end justify-between gap-4 p-5 text-right sm:p-7">
            <div>
              <h2 className="text-lg leading-6 font-bold">
                {promo.title[0]}
                <br />
                {promo.title[1]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {promo.text}
              </p>
            </div>
            <Link
              to="/"
              search={promo.search}
              hash="catalogo"
              className="inline-flex h-10 w-[140px] items-center justify-center gap-2 rounded-button bg-primary text-sm font-medium text-ink hover:bg-primary-dark"
            >
              Explorar
              <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  {
    date: '12 de setembro',
    read: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/nft-03.webp',
  },
  {
    date: '13 de setembro',
    read: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/nfts/nft-01.webp',
  },
  {
    date: '15 de setembro',
    read: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/nft-02.webp',
  },
  {
    date: '15 de setembro',
    read: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/nft-04.webp',
  },
]

export function MintJournal() {
  return (
    <section
      aria-labelledby="diario"
      className="mx-auto mt-24 max-w-content px-6"
    >
      <h2 id="diario" className="text-center text-[28px] font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm text-text-secondary">
        Histórias, guias e insights para colecionadores sobre o universo da
        propriedade digital.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-card bg-surface">
              <img
                src={post.image}
                alt=""
                width={268}
                height={195}
                loading="lazy"
                decoding="async"
                className="aspect-[268/195] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium text-text-secondary">
                  {post.date} | Leitura de {post.read} min
                </p>
                <h3 className="text-base font-bold">{post.title}</h3>
                <p className="flex-1 text-xs leading-4 font-medium text-text-secondary">
                  {post.text}
                </p>
                <button
                  type="button"
                  onClick={() => comingSoon('O Diário da Cunhagem')}
                  className="self-start text-xs font-bold text-text-accent hover:underline"
                >
                  Ler mais <span aria-hidden>→</span>
                  <span className="sr-only">: {post.title}</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
