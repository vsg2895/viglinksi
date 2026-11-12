import Image from 'next/image'
import Link from 'next/link'
import { COPY } from '@/constants/copy'
import { resolveImageUrl } from '@/lib/images'
import { Stars } from '@/components/CasinoCard'
import { CLAIMABLE_BONUS_CATEGORY } from '@/components/SpecialOfferCard'
import type { BonusSection } from '@/lib/api'
import type { SpecialOffer } from '@shared/types/specialOffer'

/** Up to two initials, for a casino with no logo artwork. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * One offer on a shelf: the casino (logo on paper and name), the offer's
 * title, the amount in gold italic, the stars, then the actions.
 *
 * Claim follows the same rule as SpecialOfferCard: it exists only on the
 * Special Offers type, and only when the offer has an affiliate link (the
 * link-less case falls back to Details, which reaches the same offer page).
 */
export function OfferCard({ offer }: { offer: SpecialOffer }) {
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY && !!offer.affiliate_url
  const logo = offer.casino ? resolveImageUrl(offer.casino.image_path) : null

  return (
    <li className="flex snap-start flex-col gap-1.5 rounded-2xl border border-line bg-ground-2 p-[18px] transition-colors hover:border-gold hover:bg-paper">
      {offer.casino && (
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 text-xs font-extrabold text-cream">
            {logo ? <Image src={logo} alt="" width={92} height={92} sizes="46px" className="h-auto max-h-full w-auto max-w-full object-contain" /> : initials(offer.casino.name)}
          </span>
          <span className="text-[13px] font-semibold text-muted">{offer.casino.name}</span>
        </span>
      )}
      <Link href={`/special-offers/${offer.slug}`} className="mt-1.5 py-0.5 text-base font-bold text-ink hover:text-brand-soft">{offer.title}</Link>
      {offer.bonuses && <span className="font-display text-[20px] italic leading-[1.2] text-gold">{offer.bonuses}</span>}
      <Stars rating={offer.rating} className="text-xs" />
      <span className="mt-auto flex flex-wrap gap-x-4 pt-1.5 text-sm font-bold">
        <Link href={`/special-offers/${offer.slug}`} aria-label={`Details: ${offer.title}`} className="inline-flex min-h-11 items-center text-gold hover:text-brand-soft">Details →</Link>
        {claimable && (
          <a href={offer.affiliate_url!} target="_blank" rel="nofollow sponsored noopener" className="inline-flex min-h-11 items-center text-brand-soft hover:text-ink">
            Claim ↗
          </a>
        )}
      </span>
    </li>
  )
}

/**
 * A horizontal track of OfferCards, from sites/viglinksi-redesign.html: one
 * row that scrolls sideways (snapping card by card) once there are more
 * cards than fit, every card in the HTML.
 */
export function OfferTrack({ offers, className = '' }: { offers: SpecialOffer[]; className?: string }) {
  return (
    <ul
      role="list"
      className={`grid snap-x snap-mandatory auto-cols-[minmax(260px,calc((100%_-_28px)/3))] grid-flow-col gap-3.5 overflow-x-auto px-0.5 pb-1.5 pt-4 ${className}`.trim()}
    >
      {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
    </ul>
  )
}

/**
 * The home page's Bonuses, from sites/viglinksi-redesign.html: one shelf per
 * bonus type — its name and count, a "See more" link, and its first offers on
 * a track. Each shelf is anchored `#bonus-<slug>` (the anchor every site's home
 * page exposes); scroll-mt clears the sticky header.
 */
export default function BonusShelves({ sections }: { sections: BonusSection[] }) {
  return (
    <div>
      {sections.map((section) => (
        <div key={section.id} id={`bonus-${section.slug}`} className="mt-[34px] scroll-mt-24">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h3 className="font-display text-[26px] text-ink sm:text-[30px]">
              <Link href={`/bonuses/${section.slug}`} className="hover:text-gold">{section.name}</Link>
              <small className="ml-2.5 font-sans text-[13px] text-faint">
                {section.offers_count} {section.offers_count === 1 ? 'offer' : 'offers'}
              </small>
            </h3>
            <Link
              href={`/bonuses/${section.slug}`}
              aria-label={`${COPY.home.seeMore} — ${section.name}`}
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-sm font-bold text-gold hover:text-brand-soft"
            >
              {COPY.home.seeMore} →
            </Link>
          </div>
          <OfferTrack offers={section.offers} />
        </div>
      ))}
    </div>
  )
}
