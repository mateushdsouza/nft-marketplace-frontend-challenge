import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// No mobile os avisos ficam embaixo, acima da barra de navegação: no topo
// eles cobriam os botões do cabeçalho (Sair, carrinho) por vários segundos.
const MOBILE = '(max-width: 767px)'

function subscribe(callback: () => void) {
  const query = window.matchMedia(MOBILE)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const isMobile = useIsMobile()
  return (
    <Sonner
      theme="dark"
      position={isMobile ? 'bottom-center' : 'top-center'}
      mobileOffset={{ bottom: 80 }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-surface)',
          '--normal-text': 'var(--color-foreground)',
          '--normal-border': 'var(--color-border)',
          '--border-radius': 'var(--radius-card)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
