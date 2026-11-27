import { NFT_SORTS, type NftSort } from '@/shared/api/types'
import { SORT_LABEL } from '@/shared/lib/labels'

export function SortSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: NftSort
  onChange: (sort: NftSort) => void
}) {
  return (
    <>
      <label htmlFor={id} className="shrink-0">
        Ordenar por:
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as NftSort)}
        className="h-9 rounded-input border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
      >
        {NFT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABEL[sort]}
          </option>
        ))}
      </select>
    </>
  )
}
