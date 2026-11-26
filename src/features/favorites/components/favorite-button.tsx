import { useLocation, useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useSession } from '@/features/auth/queries'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useFavorites } from '../api'
import { useToggleFavorite } from '../mutations'

export function FavoriteButton({
  nftId,
  nftName,
}: {
  nftId: string
  nftName: string
}) {
  const { user } = useSession()
  const favorites = useFavorites()
  const toggle = useToggleFavorite(nftName)
  const navigate = useNavigate()
  const location = useLocation()

  const isFavorite = favorites.data?.nftIds.includes(nftId) ?? false

  function handleClick() {
    // Favoritos exigem conta: o visitante vai para o login e volta para cá.
    if (!user) {
      navigate({ to: '/entrar', search: { redirect: location.href } })
      return
    }
    toggle.mutate({ nftId, favorite: !isFavorite })
  }

  return (
    <Button
      variant="outline"
      className="h-10 rounded-button"
      aria-pressed={isFavorite}
      disabled={!!user && favorites.isPending}
      onClick={handleClick}
    >
      <Heart
        aria-hidden
        className={cn(isFavorite && 'fill-primary text-primary')}
      />
      {isFavorite ? 'Favoritado' : 'Favoritar'}
    </Button>
  )
}
