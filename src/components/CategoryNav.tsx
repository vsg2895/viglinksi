import Link from 'next/link'
import type { Category } from '@shared/types/category'

/**
 * Viglinksi category selector — pill tabs with a gold active state.
 * Works on the home page (basePath="/") and the casinos listing.
 */
export default function CategoryNav({
  categories,
  selected,
  basePath = '/casinos',
}: {
  categories: Category[]
  selected: string
  basePath?: string
}) {
  return (
    <nav aria-label="Casino categories" className="flex flex-wrap gap-3">
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            // On the home page the nav is an in-page filter (basePath="/"), so it
            // keeps the query form. Anywhere else it links straight at the
            // canonical category route — never through the 301.
            href={basePath === '/' ? `/?category=${c.slug}` : `/categories/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
              active
                ? 'bg-gradient-to-b from-brand-soft to-brand-dark text-black shadow-md shadow-brand/25'
                : 'border border-line-soft bg-paper text-ink hover:border-brand hover:text-brand'
            }`}
          >
            {c.name}
            {typeof c.casinos_count === 'number' && (
              <span className={`text-xs ${active ? 'text-black/60' : 'text-faint'}`}>{c.casinos_count}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
