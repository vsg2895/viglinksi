import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { BonusSection } from '@/lib/api'

/**
 * The catch-all heading, which this row deliberately leaves out.
 *
 * Every offer that is not filed under a real type lands under "Special
 * Offers", so it is not a type at all — it is the whole area, and the site
 * already leads there from the nav and from the offers page itself. A chip for
 * it would be a second route to a page the reader can already reach, taking the
 * place of a type they cannot.
 *
 * Hiding it here rather than in the admin is deliberate: the admin's "Shown"
 * switch would remove the heading from the menu and the sections as well, and
 * the heading is still wanted there.
 */
const CATCH_ALL_SLUG = 'special-offers'

/**
 * The bonus types, as a row of buttons at the top of the home page.
 *
 * One chip per type: its mark, its name, and how many bonuses are actually
 * behind it on THIS site. Pressing one opens that type's own page.
 *
 * ── Why it sits above the listings ──────────────────────────────────────────
 *
 * The offers page is a reading surface. This is a NAVIGATION surface: a visitor
 * who arrived wanting free spins should be able to say so in one press, instead
 * of scrolling a list of everything looking for them.
 *
 * ── The counts are the point ────────────────────────────────────────────────
 *
 * A row of unlabelled buttons asks the reader to guess which ones are worth
 * pressing. The number answers that before the press, and it is the SITE's
 * number — active, claimable, owned by a casino attached to and active here —
 * resolved server-side beside the listing query, so a chip cannot promise more
 * than its page delivers.
 *
 * ── What it never renders ───────────────────────────────────────────────────
 *
 * Nothing, when the site does not publish the Bonus area or every type is
 * empty: the endpoint drops a type with no visible offers, so a chip can never
 * lead to an empty page.
 */
export default function BonusCategoryNav({ sections }: { sections: BonusSection[] }) {
  if (sections.length === 0) return null

  // The chips name TYPES of bonus; the catch-all is not one. See above.
  const types = sections.filter((section) => section.slug !== CATCH_ALL_SLUG)

  if (types.length === 0) return null

  return (
    <nav aria-label={COPY.home.bonusTypesLabel}>
      {/*
        * Wraps rather than scrolls sideways.
        *
        * A horizontal scroller would keep the single-row look on a phone at the
        * cost of hiding every chip past the second one behind a gesture nothing
        * on the page advertises — and these are the page's primary filters.
        * They wrap to short rows instead, all visible, all full-size targets.
        */}
      {/*
       * EQUAL-WIDTH chips, whatever the labels say.
       *
       * This was `flex flex-wrap`, which sizes every chip to its own content —
       * so on a phone, where each one takes its own row, the column came out
       * ragged: eight buttons of eight different widths, centred, reading as
       * eight unrelated controls rather than one set of options. The eye reads
       * that difference as importance rather than as a word count.
       *
       * A grid fixes it at the CONTAINER level instead of per chip: every track
       * is `1fr`, so the tracks are equal by definition and no chip has to know
       * what the others contain. The same fix, for the same reason, as
       * CategoryNav.
       *
       * `repeat(auto-fit, …)` keeps the breakpoints out of the code: one column
       * on a phone, two or three on a tablet, as many as fit on a desktop, with
       * no media query to keep in step with the chip count.
       *
       * An INLINE STYLE, not Tailwind classes:
       * `grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))]` is an arbitrary
       * utility, and when one of those is not generated the element is left as
       * a bare `grid` — which means ONE column at every width, silently. An
       * inline style ships in the HTML and cannot go missing.
       */}
      <ul
        style={{
          display: 'grid',
          /*
           * 15rem is measured, not guessed. The widest chip's contents — "No
           * Deposit Offers" plus its icon, its count and the chip's own padding
           * — come to ~235px, so a narrower track makes that one label wrap to
           * two lines while its neighbours stay on one. It still leaves a
           * single full-width column at 320px (the narrowest phone in use), so
           * nothing is forced into a cramped second column.
           */
          gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
          // 0.625rem is Tailwind's gap-2.5, inlined with the rest so the layout
          // has ONE source rather than half a rule here and half in a class.
          gap: '0.625rem',
          // EVERY ROW THE SAME HEIGHT. Grid stretches items within a row, so a
          // chip whose label wraps would otherwise pull only its own row taller.
          gridAutoRows: '1fr',
        }}
      >
        {types.map((section) => {
          const icon = resolveImageUrl(section.icon_path)

          return (
            <li key={section.id}>
              <Link href={`/bonuses/${section.slug}`} className="flex h-full w-full min-h-11 items-center justify-center gap-2.5 rounded-full border border-line-soft bg-paper px-5 py-3 text-sm font-semibold text-ink transition-all hover:border-brand hover:text-brand">
                {icon && (
                  /*
                   * A plain <img>, not next/image: the optimizer refuses SVG
                   * unless `dangerouslyAllowSVG` is on, and an SVG gains nothing
                   * from resizing. Served from the API's storage mount, where it
                   * was sanitised before it was ever written.
                   *
                   * alt="" and aria-hidden: the label beside it already names
                   * the type, and announcing it twice is noise.
                   */
                  <img
                    src={icon}
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] shrink-0"
                    aria-hidden
                  />
                )}

                <span>{section.name}</span>

                {/* Inside the link, as part of what the button says. */}
                <span className="text-xs text-faint font-semibold tabular-nums">{section.offers_count}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
