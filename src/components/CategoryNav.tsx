import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import MobileCollapse from '@/components/MobileCollapse'
import type { Category } from '@shared/types/category'

/**
 * Viglinksi category selector — pill tabs with a gold active state.
 * Mounted on the home page and on the casinos listing; both link at the
 * canonical /categories/<slug> route.
 */
export default function CategoryNav({
  categories,
  selected,
}: {
  categories: Category[]
  selected: string
}) {
  return (
    /*
     * ONE FULL-WIDTH COLUMN ON A PHONE, a content-sized wrapping row from
     * 640px up.
     *
     * Content sizing is right on a desktop, where the chips sit in one row and
     * their differing widths read as differing words. On a phone the same rule
     * produced a ragged stack — chips measured 156–187px wide, so some rows
     * held two and some held one and no two edges lined up, which reads as
     * unrelated buttons rather than one set of filters.
     *
     * Two equal columns do not fit: the widest chip needs ~187px and a
     * half-width track at 390px is ~166px, so a nowrap label would be pushed
     * out of its own chip. One column is the honest answer — every chip
     * identical, nothing clipped, and it matches the bonus-type block above it,
     * which is already a single column at this width.
     *
     * A plain block comment, not `{/* … *\/}`: a JSX expression container
     * cannot sit where the returned element goes.
     */
      /* On a phone the one-column stack can be folded away — see MobileCollapse. */
      <MobileCollapse
        label={COPY.collapse.casinoCategories}
        count={categories.length}
        className="min-h-11 rounded-full border border-line-soft bg-paper py-3 text-sm font-semibold text-ink transition-all hover:border-brand hover:text-brand"
        countClassName="text-xs text-faint"
        actionClassName="text-brand"
      >
      <nav aria-label="Casino categories" className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            /*
             * ALWAYS the canonical category route.
             *
             * The home page used to take the query form `/?category=<slug>` and
             * filter in place; `site-template` linked `/casinos?category=<slug>`,
             * which went through a redirect. Both are now 301'd to this very URL
             * at the edge (lib/seo/redirects.ts), so emitting either would mean
             * linking a redirect — one wasted hop per visitor, and, multiplied by
             * the number of categories, a page's worth of crawl budget spent on
             * URLs that resolve elsewhere. It is also what Search Console
             * reported as "Alternate page with proper canonical tag": the home
             * page existed once per category, each copy canonical-tagged at `/`.
             *
             * The chips therefore NAVIGATE rather than filter in place. The
             * destination renders the same list from the same endpoint, under a
             * URL that can be linked, shared and indexed.
             */
            href={`/categories/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            // The active chip carries a TRANSPARENT border purely so its box model
            // matches the inactive ones, which are bordered. Without it the selected
            // chip is 2px shorter — invisible while chips share a row and are
            // stretched to match, obvious the moment they wrap to one per row.
            //
            // `bg-origin-border` is what that border costs. A gradient is sized to the
            // PADDING box but clipped to the BORDER box, and the leftover strip is
            // filled by the image repeating — so the 1px of border showed the tail of
            // the previous tile, i.e. the gradient's far end, as a dark hairline along
            // the edge of the selected chip. Sizing it to the border box leaves nothing
            // to repeat. This chip is the only bordered button on the site, which is
            // why no other gradient here shows the same line.
            className={`flex w-full justify-center sm:flex sm:w-auto sm:justify-start items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
              active
                ? 'border border-transparent bg-origin-border bg-gradient-to-b from-brand-soft to-brand-dark text-black shadow-md shadow-brand/25'
                : 'border border-line-soft bg-paper text-ink hover:border-brand hover:text-brand'
            }`}
          >
            {/* The category's own icon, the one the Casinos menu shows beside it.
                A plain <img>: next/image refuses SVG, and an icon gains nothing
                from resizing. alt="" because the label already names it. */}
            {c.logo_path && (
              <img src={resolveImageUrl(c.logo_path)!} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
            )}
            {c.name}
            {typeof c.casinos_count === 'number' && (
              <span className={`text-xs ${active ? 'text-black/60' : 'text-faint'}`}>{c.casinos_count}</span>
            )}
          </Link>
        )
      })}
    </nav>
    </MobileCollapse>
  )
}
