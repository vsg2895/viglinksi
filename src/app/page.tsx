import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const YEAR = new Date().getFullYear()

type Props = { searchParams: Promise<{ category?: string }> }

// Resolve the selected category (default = first/highest-priority) for the home casinos section.
async function resolveCategory(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const categories = (await getCategories()).data
  const selected =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : categories[0]?.slug
  return { categories: categories as Category[], selected }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = `${COPY.home.homeTitle} ${YEAR} | ${SITE_NAME}`
  const description = COPY.home.metaDescription
  return {
    title,
    description,
    alternates: { canonical: SITE_URL },
    openGraph: { type: 'website', url: SITE_URL, siteName: SITE_NAME, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { categories, selected } = await resolveCategory(searchParams)

  const [categoryRes, offersRes, anyOffersRes] = await Promise.allSettled([
    selected ? getCategory(selected) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
  ])

  const catData =
    categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value.data : null
  const casinos: CasinoWithAttachment[] = catData?.casinos ?? []
  const activeCategory = catData?.category ?? null
  // "See More" is only an affordance when there is actually more: compare the
  // category's full count against the rows this page received, rather than
  // hard-coding the page size on both sides where the two could drift apart.
  const hasMoreCasinos = (catData?.meta?.total ?? 0) > casinos.length
  // Offers are already scoped to the selected category and capped by the backend (?category=&limit=).
  const topOffers: SpecialOffer[] = offersRes.status === 'fulfilled' ? offersRes.value.data : []

  // Whether ANY special offer is visible on this site. Drives the hero CTA:
  // a button leading to an empty page is worse than no button. On a failed
  // request this stays false, so the CTA hides rather than promising content
  // that may not be there.
  const anyOffersVisible: boolean =
    anyOffersRes.status === 'fulfilled' && anyOffersRes.value.data.length > 0

  // Organization schema is emitted site-wide from the root layout; the home
  // page only adds its page-specific ItemList of top casinos.
  //
  // The list is the SELECTED category, not the whole catalogue, so it is named
  // and addressed as that category — it previously claimed the generic name
  // "Top Casinos at <brand>" and pointed at /casinos, describing neither the
  // rows below it nor a URL that renders them.
  const listSchema = buildItemListSchema(
    activeCategory ? `${activeCategory.name} — ${COPY.home.topCasinosTitle}` : COPY.home.topCasinosTitle,
    selected ? `${SITE_URL}/categories/${selected}` : `${SITE_URL}/casinos`,
    casinos.map((c, i) => ({ position: i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  const graph = [
    buildWebPageSchema({
      // Mirrors the actual <title>. The previous "Best Online Casinos <year>"
      // was generic boilerplate shipped identically by the sibling domains and
      // matched neither this page's title nor its H1.
      name: `${COPY.home.homeTitle} ${YEAR}`,
      url: SITE_URL,
      description: COPY.home.metaDescription,
    }),
    listSchema,
    // Same array the section below renders — markup-only FAQ is a violation.
    buildFaqSchema(SITE_URL, FAQ_ITEMS),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main>
        {/* Hero */}
        <section className="hero-wash relative overflow-hidden px-4 py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              {COPY.home.heroEyebrow}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {COPY.home.heroHeadline}{' '}
              <br className="hidden sm:block" />
              <em className="font-medium italic text-brand">{COPY.home.heroHighlight}</em>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-lg text-muted">
              {COPY.home.heroSubtitle}
            </p>
            <div className="mt-11 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/casinos" className="rounded-full bg-gradient-to-b from-brand-soft to-brand-dark px-9 py-4 font-bold text-black shadow-lg shadow-brand/30 transition-transform hover:-translate-y-0.5">{COPY.home.featuredCasinos}</Link>
              {anyOffersVisible && (
                <Link href="/special-offers" className="rounded-full border border-line-soft bg-paper px-9 py-4 font-bold text-ink transition-colors hover:border-brand hover:text-brand">{COPY.home.specialOffers}</Link>
              )}
            </div>
          </div>
        </section>

        {/* Casinos by category */}
        <section className="px-4 py-14" aria-labelledby="top-casinos-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-3xl font-semibold text-ink sm:text-4xl">{COPY.home.topCasinosTitle}</h2>
                <p className="mt-2 text-muted">{COPY.home.topCasinosSubtitle}</p>
              </div>
              {selected && (
                <Link href={`/categories/${selected}`} className="text-sm font-bold text-brand hover:text-brand-dark whitespace-nowrap">{COPY.home.viewAll} →</Link>
              )}
            </div>

            {categories.length > 0 && selected && (
              <div className="mb-8"><CategoryNav categories={categories} selected={selected} basePath="/" /></div>
            )}

            {casinos.length === 0 ? (
              <p className="text-muted">{COPY.casinos.noResults}</p>
            ) : (
              <ol className="flex flex-col gap-5">
                {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} />)}
              </ol>
            )}

            {activeCategory && hasMoreCasinos && (
              <div className="mt-9 text-center">
                <Link href={`/categories/${selected}`} aria-label={`See all ${activeCategory.name} casinos`} className="inline-flex rounded-full border border-line-soft bg-paper px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                  See More →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Special offers */}
        {topOffers.length > 0 && (
          <section className="border-t border-line px-4 py-16" aria-labelledby="offers-heading">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-10 flex items-end justify-between gap-4">
                <h2 id="offers-heading" className="font-display text-3xl font-semibold text-ink sm:text-4xl">{COPY.home.specialOffers}</h2>
                <Link href="/special-offers" className="hidden text-sm font-bold text-brand hover:text-brand-dark sm:block whitespace-nowrap">{COPY.home.viewAll} →</Link>
              </div>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {topOffers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
              </div>

              <div className="mt-9 text-center">
                <Link href="/special-offers" aria-label="See all special offers" className="inline-flex rounded-full border border-line-soft bg-paper px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                  See More →
                </Link>
              </div>
            </div>
          </section>
        )}
        {/* FAQ — rendered visibly because FAQPage structured data requires it. */}
        <section className="border-t border-line px-4 py-16" aria-labelledby="faq-heading">
          <div className="container mx-auto max-w-3xl">
            <h2 id="faq-heading" className="font-display text-3xl font-semibold text-ink sm:text-4xl">{COPY.home.faqTitle}</h2>
            <dl className="mt-8 space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="border-b border-line pb-6">
                  <dt className="font-bold text-ink">{item.question}</dt>
                  <dd className="mt-2 text-muted">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
