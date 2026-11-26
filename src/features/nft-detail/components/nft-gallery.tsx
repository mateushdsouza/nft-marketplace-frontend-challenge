import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { artSrcSet } from '@/shared/lib/images'

// O Figma tem uma arte por NFT. As miniaturas mostram recortes
// (arte inteira, rosto, acessórios, roupa) da mesma imagem.
const VIEWS = [
  { label: 'Arte completa', className: 'scale-100 object-center' },
  { label: 'Detalhe do rosto', className: 'scale-[1.8] object-[50%_30%]' },
  {
    label: 'Detalhe dos acessórios',
    className: 'scale-[2.2] object-[55%_45%]',
  },
  { label: 'Detalhe da roupa', className: 'scale-[1.8] object-[50%_90%]' },
] as const

export function NftGallery({ image, name }: { image: string; name: string }) {
  const [active, setActive] = useState(0)
  const view = VIEWS[active]

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start">
      <div
        role="group"
        aria-label="Visualizações da arte"
        className="flex gap-3 md:flex-col md:gap-4"
      >
        {VIEWS.map((v, i) => (
          <button
            key={v.label}
            type="button"
            aria-pressed={active === i}
            aria-label={v.label}
            onClick={() => setActive(i)}
            className={cn(
              'size-16 shrink-0 overflow-hidden rounded-card border-2 md:size-[100px]',
              active === i ? 'border-primary' : 'border-transparent',
            )}
          >
            <img
              src={image}
              srcSet={artSrcSet(image)}
              sizes="100px"
              alt=""
              width={100}
              height={100}
              className={cn('size-full object-cover', v.className)}
            />
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 rounded-card bg-surface p-3 md:p-4">
        <div className="overflow-hidden rounded-[24px]">
          <img
            src={image}
            srcSet={artSrcSet(image)}
            sizes="(max-width: 1023px) 90vw, 444px"
            alt={`${name} — ${view.label.toLowerCase()}`}
            width={444}
            height={444}
            fetchPriority="high"
            className={cn(
              'aspect-square w-full object-cover transition-transform duration-300 motion-reduce:transition-none',
              view.className,
            )}
          />
        </div>
      </div>
    </div>
  )
}
