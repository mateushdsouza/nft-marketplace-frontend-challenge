import { Link } from '@tanstack/react-router'
import { CheckCircle2, CircleAlert, Unplug } from 'lucide-react'
import { NETWORKS, type Network, type Wallet } from '@/shared/api/types'
import { shortAddress } from '@/shared/lib/format'
import { NETWORK_LABEL } from '@/shared/lib/labels'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'rejected'

const PROVIDER_LABEL: Record<Wallet['provider'], string> = {
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
  walletconnect: 'WalletConnect',
}

export function WalletPanel({
  wallets,
  walletId,
  network,
  onWalletChange,
  onNetworkChange,
  status,
  statusMessage,
  onConnect,
  onDisconnect,
  disabled,
  walletError,
}: {
  wallets: Wallet[]
  walletId: string
  network: Network
  onWalletChange: (id: string) => void
  onNetworkChange: (network: Network) => void
  status: ConnectionStatus
  statusMessage: string | null
  onConnect: () => void
  onDisconnect: () => void
  disabled: boolean
  walletError?: string
}) {
  const selected = wallets.find((w) => w.id === walletId)
  const networkMismatch = !!selected && selected.network !== network

  if (wallets.length === 0) {
    return (
      <div className="rounded-input border border-border p-4 text-sm">
        <p>Você ainda não cadastrou uma carteira.</p>
        <Link
          to="/carteiras"
          className="mt-2 inline-block text-text-accent underline"
        >
          Cadastrar carteira
        </Link>
      </div>
    )
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-3 text-center text-base font-bold">
        Carteira e rede
      </legend>
      {wallets.map((wallet) => {
        const id = `carteira-${wallet.id}`
        return (
          <div key={wallet.id}>
            <input
              type="radio"
              id={id}
              name="walletId"
              value={wallet.id}
              checked={walletId === wallet.id}
              onChange={() => onWalletChange(wallet.id)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className="flex cursor-pointer items-center gap-3 rounded-input border border-border px-4 py-3 text-sm peer-checked:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/60"
            >
              <span
                aria-hidden
                className={cn(
                  'size-4 shrink-0 rounded-full border-2 border-primary',
                  walletId === wallet.id && 'bg-primary',
                )}
              />
              <span className="min-w-0">
                <span className="block font-bold">
                  {PROVIDER_LABEL[wallet.provider]} · {wallet.nickname}
                </span>
                <span className="block text-xs text-text-secondary">
                  {shortAddress(wallet.address)} ·{' '}
                  {NETWORK_LABEL[wallet.network]}
                  {wallet.slot === 'primary' ? ' · principal' : ' · secundária'}
                </span>
              </span>
            </label>
          </div>
        )
      })}
      {walletError && <p className="text-xs text-coral">{walletError}</p>}

      <div>
        <label htmlFor="rede" className="mb-1.5 block text-xs font-bold">
          Rede
        </label>
        <select
          id="rede"
          value={network}
          onChange={(e) => onNetworkChange(e.target.value as Network)}
          aria-invalid={networkMismatch || undefined}
          aria-describedby={networkMismatch ? 'rede-erro' : undefined}
          className="h-10 w-full rounded-input border border-border bg-ink px-3 text-sm focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error"
        >
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {NETWORK_LABEL[n]}
            </option>
          ))}
        </select>
        {networkMismatch && selected && (
          <p id="rede-erro" className="mt-1 text-xs text-coral">
            Esta carteira é da rede {NETWORK_LABEL[selected.network]}. Escolha a
            mesma rede ou outra carteira.
          </p>
        )}
      </div>

      <div
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-3 rounded-input bg-ink-soft px-4 py-3 text-sm"
      >
        <span className="flex items-center gap-2">
          {status === 'connected' ? (
            <>
              <CheckCircle2 className="size-4 text-success" aria-hidden />
              Carteira conectada
            </>
          ) : status === 'rejected' ? (
            <>
              <CircleAlert className="size-4 text-coral" aria-hidden />
              {statusMessage ?? 'Conexão recusada'}
            </>
          ) : status === 'connecting' ? (
            'Aguardando aprovação na carteira…'
          ) : (
            <>
              <Unplug className="size-4 text-text-muted" aria-hidden />
              {statusMessage ?? 'Carteira desconectada'}
            </>
          )}
        </span>
        {status === 'connected' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-button"
            onClick={onDisconnect}
          >
            Desconectar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="rounded-button"
            onClick={onConnect}
            disabled={!selected || networkMismatch || status === 'connecting'}
          >
            {status === 'rejected' ? 'Tentar de novo' : 'Conectar carteira'}
          </Button>
        )}
      </div>
    </fieldset>
  )
}
