import { zodResolver } from '@hookform/resolvers/zod'
import { Wallet as WalletIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  NETWORKS,
  type Wallet,
  type WalletProvider,
  type WalletSlot as Slot,
} from '@/shared/api/types'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { shortAddress } from '@/shared/lib/format'
import { NETWORK_LABEL, PROVIDER_LABEL, SLOT_LABEL } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { FormAlert, TextField } from '@/shared/ui/form-field'
import { useSaveWallet } from '../api'
import { walletFormSchema, type WalletFormValues } from '../schemas'

const PROVIDERS = Object.keys(PROVIDER_LABEL) as WalletProvider[]
const FIELDS = [
  'nickname',
  'network',
  'address',
  'provider',
  'ensName',
] as const

const selectClass =
  'h-10 w-full rounded-input border border-border bg-ink px-3 text-sm focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error'

export function WalletSlot({
  slot,
  wallet,
}: {
  slot: Slot
  wallet: Wallet | undefined
}) {
  const [editing, setEditing] = useState(false)
  const title = SLOT_LABEL[slot]
  const headingId = `carteira-${slot}`

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-card border border-border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-bold">
          {title}
        </h2>
        {wallet && !editing && (
          <Button
            variant="outline"
            className="rounded-button"
            aria-label={`Editar ${title.toLowerCase()}`}
            onClick={() => setEditing(true)}
          >
            Editar
          </Button>
        )}
      </div>

      {editing ? (
        <WalletForm
          slot={slot}
          wallet={wallet}
          onDone={() => setEditing(false)}
        />
      ) : wallet ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Apelido" value={wallet.nickname} />
          <Detail label="Rede" value={NETWORK_LABEL[wallet.network]} />
          <Detail
            label="Endereço"
            value={shortAddress(wallet.address)}
            title={wallet.address}
          />
          <Detail label="Provedor" value={PROVIDER_LABEL[wallet.provider]} />
          {wallet.ensName && <Detail label="ENS" value={wallet.ensName} />}
        </dl>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <WalletIcon className="size-6 text-text-muted" aria-hidden />
          <p className="flex-1 text-sm text-text-secondary">
            Nenhuma carteira cadastrada neste espaço.
          </p>
          <Button className="rounded-button" onClick={() => setEditing(true)}>
            Cadastrar {title.toLowerCase()}
          </Button>
        </div>
      )}
    </section>
  )
}

function Detail({
  label,
  value,
  title,
}: {
  label: string
  value: string
  title?: string
}) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-bold break-all" title={title}>
        {value}
      </dd>
    </div>
  )
}

function WalletForm({
  slot,
  wallet,
  onDone,
}: {
  slot: Slot
  wallet: Wallet | undefined
  onDone: () => void
}) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      nickname: wallet?.nickname ?? '',
      network: wallet?.network ?? 'ethereum',
      address: wallet?.address ?? '',
      provider: wallet?.provider ?? 'metamask',
      ensName: wallet?.ensName ?? '',
    },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    save.mutate(
      {
        id: wallet?.id ?? null,
        input: { ...values, slot, ensName: values.ensName || null },
      },
      {
        onSuccess: () => {
          toast.success(
            wallet ? 'Carteira atualizada.' : 'Carteira cadastrada.',
          )
          onDone()
        },
        onError: (error) =>
          setFormError(applyApiErrors(error, setError, FIELDS)),
      },
    )
  })

  const id = (name: string) => `${slot}-${name}`

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
      <FormAlert message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={id('apelido')}
          label="Apelido"
          error={errors.nickname?.message}
          {...register('nickname')}
        />
        <div>
          <label
            htmlFor={id('rede')}
            className="mb-1.5 block text-xs font-bold"
          >
            Rede
          </label>
          <select
            id={id('rede')}
            className={selectClass}
            {...register('network')}
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABEL[n]}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id={id('endereco')}
          label="Endereço"
          className="sm:col-span-2"
          autoComplete="off"
          spellCheck={false}
          hint="Ethereum e Polygon: 0x + 40 caracteres. Solana: 32 a 44 caracteres."
          error={errors.address?.message}
          {...register('address')}
        />
        <div>
          <label
            htmlFor={id('provedor')}
            className="mb-1.5 block text-xs font-bold"
          >
            Provedor
          </label>
          <select
            id={id('provedor')}
            className={selectClass}
            {...register('provider')}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id={id('ens')}
          label="Nome ENS (opcional)"
          placeholder="seunome.eth"
          error={errors.ensName?.message}
          {...register('ensName')}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={save.isPending}
          className="h-11 rounded-button px-6 text-sm font-bold"
        >
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-button"
          disabled={save.isPending}
          onClick={onDone}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
