import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { Category } from '@shared/types/category'

/**
 * Viglinksi category selector, from sites/viglinksi-redesign.html: a row of
 * checkbox-style chips — each a box, the name and its count, the selected one
 * ticked in gold. *
 * On a phone the chips stack, one per row, each the full width of the column;
 * from sm they are one row of EQUAL chips — `w-max` + `1fr` columns, so every
 * track resolves to the widest label — scrolling sideways in its own track if
 * the row is wider than the page.
 *
 * Mounted on the home page and on the casinos listing.
 */
export default function CategoryNav({
  categories,
  selected,
}: {
  categories: Category[]
  selected: string
}) {
  return (
    <nav aria-label="Casino categories" className="no-scrollbar -mx-4 overflow-x-auto px-4 py-1">
      <div className="grid grid-cols-1 gap-2 sm:w-max sm:auto-cols-[1fr] sm:grid-flow-col sm:grid-cols-none">
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            /*
             * ALWAYS the canonical category route.
             *
             * `/?category=<slug>` and `/casinos?category=<slug>` are both 301'd
             * to this very URL at the edge (lib/seo/redirects.ts), so emitting
             * either would mean linking a redirect — one wasted hop per visitor
             * and, per category, crawl budget spent on URLs that resolve
             * elsewhere. The segments therefore NAVIGATE rather than filter in
             * place: the destination renders the same list under a URL that
             * can be linked, shared and indexed.
             */
            href={`/categories/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 w-full items-center gap-2.5 whitespace-nowrap rounded-xl border pl-3 pr-4 text-sm font-semibold transition-colors ${active ? 'border-gold bg-gold/10 text-ink' : 'border-line-soft text-muted hover:border-gold hover:text-ink'}`}
          >
            {/* The checkbox: filled gold with an inset ring when selected. */}
            <span
              aria-hidden
              className={`h-4 w-4 shrink-0 rounded border-[1.5px] ${active ? 'border-gold bg-gold shadow-[inset_0_0_0_3px_var(--color-cream)]' : 'border-line-soft'}`}
            />
            {/* The category's own icon, the one the Casinos menu shows beside it.
                A plain <img>: next/image refuses SVG, and an icon gains nothing
                from resizing. alt="" because the label already names it. */}
            {c.logo_path && (
              <img src={resolveImageUrl(c.logo_path)!} alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
            )}
            {c.name}
            {typeof c.casinos_count === 'number' && (
              <span className="text-xs text-faint">{c.casinos_count}</span>
            )}
          </Link>
        )
      })}
      </div>
    </nav>
  )
}
