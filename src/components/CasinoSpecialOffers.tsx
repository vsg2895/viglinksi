'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
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
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {COPY.casinos.offersHeading} <span className="font-sans text-lg font-semibold text-faint">({total})</span>
        </h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous offers"
              className="grid h-8 w-8 place-items-center rounded-full border border-line-soft text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-muted"
            >
              ←
            </button>
            <span className="text-sm tabular-nums text-muted">{page + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="More offers"
              className="grid h-8 w-8 place-items-center rounded-full border border-line-soft text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-muted"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((offer) => {
          const thumb = resolveImageUrl(offer.image_path ?? offer.banner_image)
          return (
            <Link
              key={offer.id}
              href={`/special-offers/${offer.slug}`}
              className="group flex gap-4 rounded-xl border border-line bg-paper p-4 transition-colors hover:border-brand hover:bg-brand/5"
            >
              {thumb && (
                <Image
                  src={thumb}
                  alt={offer.title}
                  width={112}
                  height={64}
                  sizes="112px"
                  className="h-16 w-28 shrink-0 rounded-lg bg-cream object-contain object-center p-1"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink group-hover:text-brand">{offer.title}</span>
                {offer.bonuses && <span className="mt-1 block line-clamp-2 text-sm text-muted">{offer.bonuses}</span>}
                <span className="mt-2 inline-block text-xs font-bold text-brand">View offer →</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
