import type { NftEdition } from '@/shared/api/types'
import { EDITION_LABEL } from '@/shared/lib/labels'
import { cn } from '@/shared/lib/utils'

// Radios nativos estilizados: setas do teclado, foco e leitor de tela
// funcionam sem código extra.
export function EditionPicker({
  editions,
  value,
  onChange,
}: {
  editions: NftEdition[]
  value: string | null
  onChange: (editionId: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          const id = `edicao-${edition.id}`
          return (
            <div key={edition.id}>
              <input
                type="radio"
                id={id}
                name="edicao"
                value={edition.id}
                checked={value === edition.id}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  'inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition-colors',
                  'peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/60',
                  'peer-checked:border-primary peer-checked:font-bold peer-checked:text-text-accent',
                  'border-border-soft text-text-secondary hover:border-primary',
                  'peer-disabled:cursor-not-allowed peer-disabled:line-through peer-disabled:opacity-50 peer-disabled:hover:border-border-soft',
                )}
              >
                {EDITION_LABEL[edition.kind]}
                {soldOut && (
                  <span className="ml-1 no-underline">(esgotada)</span>
                )}
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
