import Link from 'next/link'
import { COPY } from '@/constants/copy'
import type { BonusSection } from '@/lib/api'

/**
 * The catch-all heading, which this index deliberately leaves out.
 *
 * Every offer not filed under a real type lands under "Special Offers", so it
 * is not a type at all — it is the whole area, already reachable from the nav
 * and the offers page. Hidden here rather than in the admin: the admin's
 * "Shown" switch would also remove it from the menu and the sections.
 */
const CATCH_ALL_SLUG = 'special-offers'

/**
 * "Bonus Categories", from sites/viglinksi-redesign.html: a table of contents
 * — each bonus type in serif, a dotted leader, and how many bonuses it holds,
 * set in two columns from sm. Each entry opens that type's own page.
 *
 * The counts are the SITE's — active, claimable, owned by a casino attached
 * here — resolved server-side, so an entry never promises more than its page
 * has. Renders nothing when the site has no Bonus area or every type is empty.
 */
export default function BonusCategoryNav({ sections }: { sections: BonusSection[] }) {
  const types = sections.filter((section) => section.slug !== CATCH_ALL_SLUG)
  if (types.length === 0) return null

  return (
    <nav aria-labelledby="bonus-types-heading">
      <p className="eyebrow">Index</p>
      <h2 id="bonus-types-heading" className="font-display mt-2.5 text-[38px] leading-none text-ink sm:text-[clamp(38px,5vw,62px)]">
        {COPY.home.bonusTypesTitle}
      </h2>
      <ul className="mt-[30px] gap-14 sm:columns-2" role="list">
        {types.map((section) => (
          <li key={section.id} className="break-inside-avoid">
            <Link
              href={`/bonuses/${section.slug}`}
              className="group flex items-baseline gap-3 border-b border-line py-3.5 text-ink"
            >
              <span className="font-display text-[28px] leading-[1.1] group-hover:text-gold">{section.name}</span>
              <span aria-hidden className="toc-leader" />
              <span className="text-[15px] font-extrabold text-gold">
                {section.offers_count}
                <span className="sr-only"> {section.offers_count === 1 ? COPY.bonusCategory.countOne : COPY.bonusCategory.countMany}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
