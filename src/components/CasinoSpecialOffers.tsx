'use client'

import { useState } from 'react'
import Link from 'next/link'
import { COPY } from '@/constants/copy'
import type { SpecialOffer } from '@shared/types/specialOffer'

const PER_PAGE = 4

/**
 * A casino's attached special offers, shown 4 at a time with the total count.
 * When there are more than 4, client-side pagination pages through them (the
 * offers already arrive with the casino, so no extra fetch is needed).
 */
export default function CasinoSpecialOffers({ offers }: { offers: SpecialOffer[] }) {
  const [page, setPage] = useState(0)

  // The API may serialize an empty relation as {} rather than []; guard for it
  // so a casino with no offers doesn't crash (offers.slice is not a function).
  const list = Array.isArray(offers) ? offers : []
  const total = list.length
  if (total === 0) return null

  const pageCount = Math.ceil(total / PER_PAGE)
  const start = page * PER_PAGE
  const visible = list.slice(start, start + PER_PAGE)

  return (
    <section className="mt-11">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 font-display text-[28px] leading-[1.05] text-ink sm:text-[38px]">
          {COPY.casinos.offersHeading} <span className="text-faint">({total})</span>
        </h2>
        {pageCount > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-soft text-muted transition-colors hover:border-gold hover:text-ink disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-muted"
            >
              ←
            </button>
            {/* `whitespace-nowrap`, and it is load-bearing: in a flex row next
                to a heading this is three tokens ("1", "/", "2"), and a long
                heading squeezed it into three stacked lines between the two
                arrows. The counter is one word, so it is told to behave like
                one. */}
            <span className="whitespace-nowrap text-sm tabular-nums text-muted">{page + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="More offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-soft text-muted transition-colors hover:border-gold hover:text-ink disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-muted"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* The design's ruled rows: the type, the offer and its bonus, the link —
          the whole row one link to the offer's page. */}
      <div className="flex flex-col gap-3">
        {visible.map((offer) => (
          <Link
            key={offer.id}
            href={`/special-offers/${offer.slug}`}
            className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-line px-5 py-[18px] text-ink transition-colors hover:border-gold hover:bg-ground-2 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-4"
          >
            {/* The bonus TYPE, as the editor named it; an unfiled offer leaves
                the cell empty rather than printing a blank label. */}
            <span className="eyebrow text-[10px]">{offer.bonus_category_name ?? ''}</span>
            <span className="min-w-0">
              <b className="block font-display text-[24px] font-normal leading-[1.1]">{offer.title}</b>
              {offer.bonuses && <span className="line-clamp-2 text-sm text-muted">{offer.bonuses}</span>}
            </span>
            <span className="text-sm font-bold text-gold">View offer →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
