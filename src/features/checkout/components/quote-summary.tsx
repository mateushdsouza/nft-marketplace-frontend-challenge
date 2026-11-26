import type { Quote } from '@/shared/api/types'
import { EDITION_LABEL, NETWORK_LABEL } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/money'
import { artSrcSet } from '@/shared/lib/images'

// Itens e valores de uma cotação, exatamente como vieram da API.
export function QuoteSummary({ quote }: { quote: Quote }) {
  return (
    <div>
      <div className="flex justify-between border-b border-border pb-2 text-sm font-bold">
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="mt-3 space-y-2">
        {quote.items.map((line) => (
          <li
            key={`${line.nftId}-${line.editionId}`}
            className="flex items-center gap-3 rounded-input bg-ink-soft p-2"
          >
            <img
              src={line.image}
              srcSet={artSrcSet(line.image)}
              sizes="64px"
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-input object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{line.name}</p>
              <p className="text-xs text-text-secondary">
                Edição {EDITION_LABEL[line.editionKind]} · ID do token:{' '}
                {line.tokenId}
              </p>
            </div>
            <span className="text-xs text-text-secondary">
              (x {line.quantity})
            </span>
            <span className="font-bold text-text-accent">
              {formatEth(line.lineTotalEth)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Subtotal</dt>
          <dd>{formatEth(quote.subtotalEth)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">
            {quote.coupon
              ? `Desconto (${quote.coupon.code} · ${quote.coupon.percentOff}%)`
              : 'Desconto do lançamento'}
          </dt>
          <dd>(-) {formatEth(quote.discountEth)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">
            Taxa de rede ({NETWORK_LABEL[quote.network]})
          </dt>
          <dd>{formatEth(quote.networkFeeEth)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-text-accent">{formatEth(quote.totalEth)}</dd>
        </div>
      </dl>
    </div>
  )
}
