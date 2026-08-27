import type { Metadata } from 'next'
import { getCategories, getCategory } from '@/lib/api'
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import Pagination from '@/components/Pagination'
import { SITE_URL } from '@/lib/config'
import type { Category } from '@shared/types/category'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { searchParams: Promise<{ category?: string; page?: string }> }

async function resolve(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const categories = (await getCategories()).data
  // `requested` is the category the URL actually asked for; `selected` falls back
  // to the first category so the page always renders something. The two must stay
  // distinct: the canonical may only reflect what was requested, or the clean
  // /casinos URL would declare itself a duplicate of /casinos?category=<first>.
  const requested =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : undefined
  const selected = requested ?? categories[0]?.slug
  return { categories, requested, selected, page }
}

/**
 * The canonical URL for a listing view, carrying only the parameters that
 * genuinely change the content.
 */
function canonicalPathFor(selected: string | undefined, page: number): string {
  // Under the Option B consolidation /categories/<slug> is the canonical home of
  // a category, and /casinos?category=<slug> 301s there (see next.config). What
  // reaches this page is therefore only the bare /casinos, which renders the
  // default category — so it points at that category's canonical URL rather
  // than competing with it as a second copy of the same list.
  //
  // A PATH, not an absolute URL: Next resolves alternates.canonical and
  // openGraph.url against `metadataBase`, so the host is named once (lib/config)
  // and cannot drift per page. JSON-LD needs absolute URLs and prefixes
  // SITE_URL at its own call site.
  if (!selected) {
    return '/casinos'
  }

  return `/categories/${selected}${page > 1 ? `?page=${page}` : ''}`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { selected, page } = await resolve(searchParams)
  // Page 2+ gets its own title so paginated views are not reported as duplicate
  // titles, and so a searcher landing on one knows where they are.
  const title = page > 1 ? `${COPY.casinos.pageTitle} — Page ${page}` : COPY.casinos.pageTitle
  const canonical = canonicalPathFor(selected, page)

  return {
    title,
    description: COPY.casinos.pageDescription,
    // Self-referencing canonical. Pointing page 3 back at page 1 (the previous
    // behaviour) tells Google the deeper pages are duplicates of the first, so
    // the casinos listed only on those pages never get indexed.
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description: COPY.casinos.pageDescription },
  }
}

export default async function CasinosPage({ searchParams }: Props) {
  const { categories, selected, page } = await resolve(searchParams)

  if (!selected) {
    return (
      <main className="px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-semibold text-ink">{COPY.casinos.pageTitle}</h1>
          <p className="mt-4 text-muted">{COPY.casinos.noResults}</p>
        </div>
      </main>
    )
  }

  const { category, casinos, meta } = (await getCategory(selected, page)).data
  // Paginate on the canonical route so no internal link goes through the 301.
  const basePath = `/categories/${selected}`
  const cats = categories as Category[]

  const listSchema = buildItemListSchema(
    `${category.name} — ${COPY.casinos.pageTitle}`,
    `${SITE_URL}${basePath}`,
    casinos.map((c, i) => ({ position: (meta.current_page - 1) * meta.per_page + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  const pageUrl = `${SITE_URL}${canonicalPathFor(selected, page)}`
  const graph = [
    buildWebPageSchema({
      name: COPY.casinos.pageTitle,
      url: pageUrl,
      description: COPY.casinos.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    // The trail follows the canonical path (Home → Categories → this category),
    // not the /casinos URL the visitor may have typed — that one redirects, and
    // a breadcrumb pointing through a redirect wastes the signal.
    buildBreadcrumbSchema(
      [
        { name: 'Home', url: SITE_URL },
        { name: COPY.nav.categories, url: `${SITE_URL}/categories` },
        { name: category.name, url: `${SITE_URL}${basePath}` },
      ],
      pageUrl,
    ),
    listSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <main className="px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <header className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-ink">{COPY.casinos.pageTitle}</h1>
            <p className="mt-2 text-muted">{COPY.casinos.pageDescription}</p>
          </header>

          {/* Category menu — top of the casinos list */}
          <div className="mb-8"><CategoryNav categories={cats} selected={selected} /></div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">{category.name}</h2>
            <span className="text-sm text-faint">{meta.total} casinos</span>
          </div>

          {casinos.length === 0 ? (
            <p className="text-muted">{COPY.casinos.noResults}</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {casinos.map((casino, i) => (
                <CasinoCard key={casino.id} casino={casino} rank={(meta.current_page - 1) * meta.per_page + i + 1} />
              ))}
            </ol>
          )}

          <Pagination basePath={basePath} current={meta.current_page} last={meta.last_page} />
        </div>
      </main>
    </>
  )
}
