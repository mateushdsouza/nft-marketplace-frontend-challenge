import { ArrowRight } from 'lucide-react'
import { artSrcSet } from '@/shared/lib/images'

// No mobile o Figma usa um card compacto (título menor, artes sobrepostas à
// direita, "Explorar" como link de texto); no desktop, texto grande e a arte
// ao lado. Os textos mudam entre os dois frames, por isso existem duas versões.
export function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="mx-auto mt-4 w-full max-w-content px-6 md:mt-8"
    >
      <div className="relative grid grid-cols-[1fr_138px] items-center gap-2 overflow-hidden rounded-[30px] bg-gradient-to-br from-primary/20 to-primary/10 p-4 pb-7 md:grid-cols-[1fr_minmax(0,380px)] md:gap-10 md:rounded-none md:bg-none md:p-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -left-20 size-62 rounded-full bg-gradient-to-br from-primary-light/40 to-transparent md:hidden"
        />
        <div className="relative md:px-6">
          <p className="text-xs font-medium md:text-sm md:font-normal">
            Bem-vindo à Kurio
          </p>
          <h1
            id="hero-titulo"
            className="mt-1.5 text-lg leading-[29px] font-bold tracking-wide uppercase md:mt-6 md:text-[43px] md:leading-[1.6]"
          >
            <span className="md:hidden">
              Seja dono da
              <br />
              cultura digital
            </span>
            <span className="hidden md:inline">
              Seja dono do futuro
              <br />
              da arte digital
            </span>
          </h1>
          <p className="mt-1.5 text-xs leading-[18px] text-text-secondary md:mt-4 md:max-w-md md:text-sm md:leading-6">
            <span className="md:hidden">
              Descubra NFTs selecionados de criadores do mundo todo.
            </span>
            <span className="hidden md:inline">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </span>
          </p>
          <a
            href="#catalogo"
            className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-text-accent uppercase hover:underline md:mt-8 md:h-9 md:rounded-button md:bg-primary md:px-6 md:text-ink md:hover:bg-primary-dark md:hover:no-underline"
          >
            Explorar
            <ArrowRight aria-hidden className="size-4 md:hidden" />
          </a>
        </div>
        <div className="relative pb-2 md:pb-0">
          <img
            src="/nfts/nft-01.webp"
            srcSet={artSrcSet('/nfts/nft-01.webp')}
            sizes="(max-width: 767px) 138px, 380px"
            alt="Emerald Ape, macaco de óculos escuros e jaqueta verde"
            width={380}
            height={380}
            fetchPriority="high"
            className="aspect-square w-full rounded-2xl object-cover md:rounded-art"
          />
          <img
            src="/nfts/nft-02.webp"
            srcSet={artSrcSet('/nfts/nft-02.webp')}
            sizes="58px"
            alt=""
            width={58}
            height={58}
            className="absolute -bottom-0 left-3.5 size-[58px] rounded-2xl border-2 border-surface object-cover md:hidden"
          />
        </div>
        <div
          aria-hidden
          className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 md:bottom-0 md:left-[40%]"
        >
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-[7px] rounded-full bg-primary" />
          ))}
        </div>
      </div>
    </section>
  )
}
