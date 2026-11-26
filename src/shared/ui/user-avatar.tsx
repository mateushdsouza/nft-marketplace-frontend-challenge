import { cn } from '@/shared/lib/utils'

// Foto do usuário ou, sem foto, a inicial do nome.
export function UserAvatar({
  name,
  src,
  className,
  alt = '',
}: {
  name: string
  src: string | null
  className?: string
  alt?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={80}
        height={80}
        className={cn('size-8 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={cn(
        'flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-ink',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
