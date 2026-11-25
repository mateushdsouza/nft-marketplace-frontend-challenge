import { useState, type FormEvent } from 'react'
import {
  CATEGORIES,
  NETWORKS,
  type Category,
  type FacetCount,
  type Network,
} from '@/shared/api/types'
import { CATEGORY_LABEL, NETWORK_LABEL } from '@/shared/lib/labels'
import { compareEth, isValidEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { CatalogSearch } from '../search'

type FilterPatch = Partial<
  Pick<CatalogSearch, 'category' | 'network' | 'minPrice' | 'maxPrice'>
>

interface FiltersPanelProps {
  search: CatalogSearch
  facets?: {
    categories: FacetCount<Category>[]
    networks: FacetCount<Network>[]
  }
  onChange: (patch: FilterPatch) => void
  onClear: () => void
}

function countOf<T extends string>(list: FacetCount<T>[] | undefined, v: T) {
  const found = list?.find((item) => item.value === v)
  return found ? `(${found.count})` : ''
}

function FacetButton({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-input px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-raised',
        selected
          ? 'bg-surface-raised font-bold text-text-accent'
          : 'text-text-secondary',
      )}
    >
      <span>{label}</span>
      <span className={selected ? 'text-text-accent' : 'text-primary'}>
        {count}
      </span>
    </button>
  )
}

export function FiltersPanel({
  search,
  facets,
  onChange,
  onClear,
}: FiltersPanelProps) {
  const hasFilters = Boolean(
    search.category || search.network || search.minPrice || search.maxPrice,
  )

  return (
    <div className="space-y-8 rounded-card bg-surface p-5">
      <fieldset>
        <legend className="mb-3 text-base font-bold">Coleções</legend>
        <ul className="space-y-1">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <FacetButton
                label={CATEGORY_LABEL[category]}
                count={countOf(facets?.categories, category)}
                selected={search.category === category}
                onClick={() =>
                  onChange({
                    category:
                      search.category === category ? undefined : category,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <PriceRangeForm
        // Remonta o formulário quando a URL muda (ex.: voltar no histórico).
        key={`${search.minPrice ?? ''}-${search.maxPrice ?? ''}`}
        minPrice={search.minPrice}
        maxPrice={search.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
      />

      <fieldset>
        <legend className="mb-3 text-base font-bold">Rede</legend>
        <ul className="space-y-1">
          {NETWORKS.map((network) => (
            <li key={network}>
              <FacetButton
                label={NETWORK_LABEL[network]}
                count={countOf(facets?.networks, network)}
                selected={search.network === network}
                onClick={() =>
                  onChange({
                    network: search.network === network ? undefined : network,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </fieldset>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-button"
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

function PriceRangeForm({
  minPrice,
  maxPrice,
  onApply,
}: {
  minPrice?: string
  maxPrice?: string
  onApply: (min?: string, max?: string) => void
}) {
  const [min, setMin] = useState(minPrice ?? '')
  const [max, setMax] = useState(maxPrice ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextMin = min.trim().replace(',', '.')
    const nextMax = max.trim().replace(',', '.')
    if (
      (nextMin && !isValidEth(nextMin)) ||
      (nextMax && !isValidEth(nextMax))
    ) {
      setError('Use apenas números, como 0.5 ou 2.')
      return
    }
    if (nextMin && nextMax && compareEth(nextMin, nextMax) > 0) {
      setError('O preço mínimo não pode ser maior que o máximo.')
      return
    }
    setError(null)
    onApply(nextMin || undefined, nextMax || undefined)
  }

  const inputClass =
    'h-10 w-full rounded-input border border-border bg-ink px-3 text-sm text-foreground placeholder:text-secondary focus-visible:border-primary focus-visible:outline-none aria-invalid:border-error'

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend className="mb-3 text-base font-bold">Faixa de preço</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="preco-min" className="mb-1 block text-xs">
              Mínimo (ETH)
            </label>
            <input
              id="preco-min"
              inputMode="decimal"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0.02"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'preco-erro' : undefined}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="preco-max" className="mb-1 block text-xs">
              Máximo (ETH)
            </label>
            <input
              id="preco-max"
              inputMode="decimal"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="12.30"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'preco-erro' : undefined}
              className={inputClass}
            />
          </div>
        </div>
        {error && (
          <p id="preco-erro" role="alert" className="mt-2 text-xs text-coral">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" className="mt-3 rounded-button">
          Aplicar
        </Button>
      </fieldset>
    </form>
  )
}
