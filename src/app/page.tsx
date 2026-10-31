import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBonusArea, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import type { BonusSection } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import BonusCategoryNav from '@/components/BonusCategoryNav'
import CategoryNav from '@/components/CategoryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'

/**
 * Grid placement for the FAQ cards. The grid is 2-up on tablets and 3-up on
 * desktop, and the number of questions is whatever the site's faq.ts holds, so
 * the LAST card stretches across whatever the final row leaves empty — five
 * questions fill a 3-column grid exactly instead of leaving a hole.
 */
function faqSpan(i: number): string {
  const last = i === FAQ_ITEMS.length - 1
  if (!last) return ''
  const sm = FAQ_ITEMS.length % 2 === 1 ? 'sm:col-span-2' : 'sm:col-span-1'
  const lg = { 0: 'lg:col-span-1', 1: 'lg:col-span-3', 2: 'lg:col-span-2' }[FAQ_ITEMS.length % 3] ?? ''
  return `${sm} ${lg}`
}

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const YEAR = new Date().getFullYear()

type Props = { searchParams: Promise<{ category?: string; page?: string }> }

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
    alternates: { canonical: '/' },
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomePage({ searchParams }: Props) {
  /*
   * THE HOME PAGE HAS ONE PAGE, so `?page=2` is a page past the end.
   *
   * Nothing here is paginated (the full list is /casinos), yet `/?page=2` and
   * every other number a crawler guessed answered 200 with the whole home page
   * and an `index` robots tag: a duplicate of `/` at a URL of its own. A 404
   * says it is not a page at all, the rule every paginated listing here applies
   * past its last page. `?page=1` never reaches this: proxy.ts 301s it to `/`.
   */
  if (Math.max(1, Number((await searchParams).page) || 1) > 1) notFound()

  const { categories, selected } = await resolveCategory(searchParams)

  const [categoryRes, offersRes, anyOffersRes, bonusRes] = await Promise.allSettled([
    selected ? getCategory(selected) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
    // The bonus TYPES, for the chip row under the hero. `limit: 1` because the
    // chips need the names, the marks and the counts — not the offers. Runs
    // alongside the others, so it costs no extra round-trip, and allSettled
    // means a site without the Bonus area simply renders no chips.
    getBonusArea(1),
  ])

  // Empty when the site does not publish the Bonus area, or when the
  // request failed — the strip renders nothing either way.
  const bonusSections: BonusSection[] = bonusRes.status === 'fulfilled' ? bonusRes.value : []

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
        <section className="hero-wash relative overflow-hidden px-4 py-10 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] sm:mb-8 sm:px-5 sm:py-2 sm:text-xs sm:tracking-[0.25em] text-brand">
              {COPY.home.heroEyebrow}
            </p>
            <h1 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-6xl">
              {COPY.home.heroHeadline}{' '}
              <br className="hidden sm:block" />
              <em className="font-medium italic text-brand">{COPY.home.heroHighlight}</em>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted sm:mt-7 sm:text-lg">
              {COPY.home.heroSubtitle}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:mt-11 sm:gap-4 sm:flex-row">
              <Link href="/casinos" className="rounded-full bg-gradient-to-b from-brand-soft to-brand-dark w-full sm:w-auto whitespace-nowrap px-6 py-3.5 text-center text-base font-bold sm:flex-none sm:px-9 sm:py-4 sm:text-base text-black shadow-lg shadow-brand/30 transition-transform hover:-translate-y-0.5">{COPY.home.featuredCasinos}</Link>
              {anyOffersVisible && (
                <Link href="/special-offers" className="rounded-full border border-line-soft bg-paper w-full sm:w-auto whitespace-nowrap px-6 py-[13px] text-center text-base font-bold sm:flex-none sm:px-9 sm:py-[15px] sm:text-base text-ink transition-colors hover:border-brand hover:text-brand">{COPY.home.specialOffers}</Link>
              )}
            </div>
          </div>
        </section>

        {/* Casinos by category */}
        <section className="px-4 py-8 sm:py-14" aria-labelledby="top-casinos-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-4 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-2xl font-semibold text-ink sm:text-4xl">{COPY.home.topCasinosTitle}</h2>
                <p className="mt-1 text-sm text-muted sm:mt-2 sm:text-base">{COPY.home.topCasinosSubtitle}</p>
              </div>
              {selected && (
                <Link href={`/categories/${selected}`} className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-bold text-brand hover:text-brand-dark whitespace-nowrap">{COPY.home.viewAll} →</Link>
              )}
            </div>

            {categories.length > 0 && selected && (
              <div className="mb-5 sm:mb-8"><CategoryNav categories={categories} selected={selected} /></div>
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

        {/* Bonus types — directly under the casino list.

            The casinos are what visitors came for, so they come first under
            the hero; the bonus-type chips follow as the next way in.

            Renders nothing when the site does not publish the Bonus area, so
            the band collapses rather than leaving a gap. */}
        {bonusSections.length > 0 && (
          <section className="px-4 pb-10">
            <div className="container mx-auto max-w-6xl">
              {/*
                * The chips sit on their own panel rather than on the bare page.
                *
                * On the plain ground the row read as loose buttons left over
                * from the hero; a panel makes it one control surface, which is
                * what it is. The colour is this site's own — the two blurred
                * discs are its brand and accent, kept low enough that the CHIPS
                * stay the brightest thing in the band. A saturated panel would
                * flatten them by contrast.
                */}
              {/*
                * The panel is the PAGE'S OWN GROUND with a wash of this site's
                * colour over it — not `bg-paper`.
                *
                * Paper is what the CHIPS are made of (and on crogambline a chip
                * is a border with nothing behind it at all), so a paper panel
                * left every chip invisible and the row read as a wireframe
                * table: hairlines on a flat field. Putting the panel on the
                * ground the chips normally sit on restores the contrast they
                * are designed for, and the tint is what makes it a band rather
                * than empty page.
                *
                * No ring either. On a dark ground a `ring-line` drew a hard
                * rectangle around the whole block — one more line in a block
                * whose problem was lines. The tint gives it its edge.
                */}
              <div className="relative overflow-hidden rounded-3xl bg-cream px-4 py-6 sm:px-8 sm:py-8">
                {/* Decoration only. No -z-10: the panel paints its own
                    background, and a layer sent behind it would never be seen. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(230,195,126,0.12),transparent_62%)]" />
                  <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(230,195,126,0.20),transparent_70%)] blur-2xl" />
                  <div className="absolute -right-20 -bottom-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(176,114,232,0.18),transparent_70%)] blur-2xl" />
                </div>

                <div className="relative">
                  <BonusCategoryNav sections={bonusSections} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Special offers */}
        {topOffers.length > 0 && (
          <section className="border-t border-line px-4 py-16" aria-labelledby="offers-heading">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-10 flex items-end justify-between gap-4">
                <h2 id="offers-heading" className="font-display text-3xl font-semibold text-ink sm:text-4xl">{COPY.home.specialOffers}</h2>
                <Link href="/special-offers" className="hidden py-3 -my-3 text-sm font-bold text-brand hover:text-brand-dark sm:block whitespace-nowrap">{COPY.home.viewAll} →</Link>
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
        {/* FAQ — rendered visibly because FAQPage structured data requires it.
            Wider than the rest of the page (90rem, not the 6xl the listings
            use) and with roomier cards on desktop: a block of prose reads better with a
            longer measure than a list of casino cards does, and the old
            max-w-3xl column left a third of the screen empty on each side.
            Three-up card grid, two-up on tablets, one column on phones. */}
        <section className="border-t border-line px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-[90rem]">
            <h2 id="faq-heading" className="font-display text-3xl font-semibold text-ink sm:text-4xl">{COPY.home.faqTitle}</h2>
            <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
              {FAQ_ITEMS.map((item, i) => (
                <div key={item.question} className={`${faqSpan(i)} rounded-2xl bg-paper p-6 lg:p-8 shadow-[0_10px_30px_rgba(28,36,48,0.07)]`}>
                  <dt className="font-bold text-ink text-base lg:text-lg">{item.question}</dt>
                  <dd className="mt-3 text-sm leading-relaxed text-muted lg:text-base">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
