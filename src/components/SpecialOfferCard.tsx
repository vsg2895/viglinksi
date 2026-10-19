import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import OfferBanner from '@/components/OfferBanner'
import type { SpecialOffer } from '@shared/types/specialOffer'

/**
 * The bonus type whose cards carry a Claim button.
 *
 * WHY A TYPE AND NOT THE LINK. Claim used to appear on any offer that happened
 * to carry an affiliate URL, which made the card's primary action a property of
 * the data rather than an editorial decision: filing a bonus under "Free Spins"
 * or "Cashback" still produced a Claim button, because those offers have links
 * too. Claim now means one thing — this is a Special Offer — and whether the
 * offer has a link of its own no longer decides it.
 */
export const CLAIMABLE_BONUS_CATEGORY = 'special-offers'

// Viglinksi design: plum panel offer card with a full-bleed banner, green
// bonus chip and a crimson Claim CTA.
export default function SpecialOfferCard({ offer }: { offer: SpecialOffer }) {
  // Full-bleed banner across the top of the card (prefer the wide banner image).
  const preview = resolveImageUrl(offer.banner_image ?? offer.image_path)

  // Claim is a property of the bonus TYPE, not of whether a link happens
  // to be filled in. See CLAIMABLE_BONUS_CATEGORY.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
      {/* The banner is shown whole, on the backdrop every bonus block shares
          — see OfferBanner. The box keeps its 16:9 shape so a grid of cards
          stays a grid whatever ratio the artwork came in at, and the backdrop
          renders even when a bonus has no artwork yet. */}
      <Link href={`/special-offers/${offer.slug}`} className="relative block aspect-video overflow-hidden bg-cream">
        <OfferBanner src={preview} alt={offer.title} sizes="(max-width: 768px) 100vw, 400px" zoomOnHover />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        {/* WHOSE bonus this is, above its name.
        The title says what the offer gives; a card in a grid of twenty does
        not say who gives it, which is the first thing someone comparing
        offers needs. Bold and in the brand accent so it reads as a byline
        rather than a second heading competing with the title below.
        Rendered only when the casino is loaded — the relation is eager
        loaded on every endpoint that feeds these cards, and a card without
        it simply omits the line rather than printing a blank. */}
        {offer.casino?.name && (
          <p className="text-sm font-bold text-win">{offer.casino.name}</p>
        )}
        <h3 className="font-display text-lg font-semibold leading-tight text-ink">{offer.title}</h3>
        {offer.bonuses && <p className="inline-block rounded-lg bg-win-bg px-3 py-1.5 text-sm font-bold text-win">{offer.bonuses}</p>}
        <span className="text-gold" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}<span className="text-line-soft">{'★'.repeat(5 - offer.rating)}</span></span>
        <div className="mt-auto flex gap-2.5 pt-2">
          {/*
            * Claim belongs to the Special Offers bonus type and to nothing else.
            *
            * Three states, and the middle one is why this is not just
            * `offer.affiliate_url &&`:
            *
            *   Special Offers + link   →  Details · Claim → the casino
            *   Special Offers, NO link →  Claim alone, leading to the offer's own
            *                              page, where the terms and the operator
            *                              are. One button rather than two to the
            *                              same place.
            *   any other bonus type    →  Details alone. A Free Spins or Cashback
            *                              card is a link to a write-up, not a
            *                              call to action.
            */}
          {!(claimable && !offer.affiliate_url) && (
            <Link href={`/special-offers/${offer.slug}`} className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line-soft bg-paper px-3 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:border-brand hover:text-brand">Details</Link>
          )}
          {claimable && (
            offer.affiliate_url ? (
              <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-brand-soft to-brand-dark px-3 py-2.5 text-center text-sm font-bold text-black shadow-md shadow-brand/25 transition-transform hover:-translate-y-0.5">Claim</a>
            ) : (
              // No affiliate URL of its own: the offer's page is the only place that
              // can actually lead to the operator, so Claim goes there rather than
              // nowhere. An internal link, so no sponsored rel.
              <Link href={`/special-offers/${offer.slug}`} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-brand-soft to-brand-dark px-3 py-2.5 text-center text-sm font-bold text-black shadow-md shadow-brand/25 transition-transform hover:-translate-y-0.5">Claim</Link>
            )
          )}
        </div>
      </div>
    </article>
  )
}
