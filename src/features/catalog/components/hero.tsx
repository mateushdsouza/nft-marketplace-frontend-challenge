import { ArrowRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="mx-auto mt-6 max-w-content px-6 md:mt-8"
    >
      <div className="grid items-center gap-6 rounded-art bg-gradient-to-br from-surface to-surface-raised p-5 md:grid-cols-[1fr_minmax(0,380px)] md:gap-10 md:bg-none md:p-0">
        <div className="md:px-6">
          <p className="text-xs md:text-sm">Bem-vindo à Kurio</p>
          <h1
            id="hero-titulo"
            className="mt-3 text-2xl leading-tight font-bold tracking-wide uppercase md:mt-6 md:text-[43px] md:leading-[1.6]"
          >
            Seja dono do futuro <br className="hidden md:block" />
            da arte digital
          </h1>
          <p className="mt-3 max-w-md text-xs leading-5 text-text-secondary md:mt-4 md:text-sm md:leading-6">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <Button
            asChild
            className="mt-5 h-9 rounded-button px-6 text-xs font-bold uppercase md:mt-8"
          >
            <a href="#catalogo">
              Explorar
              <ArrowRight aria-hidden className="md:hidden" />
            </a>
          </Button>
        </div>
        <img
          src="/nfts/nft-01.webp"
          alt="Emerald Ape, macaco de óculos escuros e jaqueta verde"
          width={380}
          height={380}
          fetchPriority="high"
          className="hidden aspect-square w-full rounded-art object-cover md:block"
        />
      </div>
    </section>
  )
}
