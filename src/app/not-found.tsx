import type { Metadata } from 'next'
import Link from 'next/link'
import { hasSpecialOffers } from '@/lib/api'
import { COPY } from '@/constants/copy'

/**
 * Branded 404.
 *
 * Next returns the correct 404 status either way, but the default page is a
 * dead end: no navigation, no internal links. That wastes the crawl and loses
 * the visitor. `noindex, follow` is the right pair here — the page itself must
 * never be indexed, while the links on it should still pass crawl signal.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/casinos', label: COPY.nav.casinos },
  { href: '/categories', label: COPY.nav.categories },
  { href: '/special-offers', label: COPY.nav.specialOffers },
]

export default async function NotFound() {
  // Same rule as the header nav: a link to an empty offers page is a worse dead
  // end than no link, and this page exists precisely to recover a dead end.
  const showSpecialOffers = await hasSpecialOffers()
  const links = LINKS.filter(({ href }) => href !== '/special-offers' || showSpecialOffers)

  return (
    <main className="px-4 py-24">
      <div className="container mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-4 text-muted">{COPY.errors.notFound} Try one of these instead:</p>
        <nav aria-label="Helpful links" className="mt-8">
          <ul className="flex flex-wrap justify-center gap-3" role="list">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex rounded-full border border-line-soft bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
