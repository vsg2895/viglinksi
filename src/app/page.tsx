import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBonusArea, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import type { BonusSection } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema, SHARE_IMAGES } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard, { CASINO_GRID } from '@/components/CasinoCard'
import BonusCategoryNav from '@/components/BonusCategoryNav'
import BonusShelves from '@/components/BonusShelves'
import CategoryNav from '@/components/CategoryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'
import { casinosHeading } from '@/lib/categories'

/** Offers shown per bonus type in the home page's Bonuses section — one row. */
const HOME_BONUSES_PER_CATEGORY = 3

/**
 * The hero's "audit file": what a casino must clear to be listed — the same
 * four tests the FAQ below describes. Failing one keeps a casino off the list.
 */
const LISTING_CHECKS = [
  { title: 'A current licence', text: 'Valid at the time of the audit.' },
  { title: 'Honest withdrawal limits', text: 'They match the published terms.' },
  { title: 'Fair wagering', text: 'A bonus we would accept ourselves.' },
  { title: 'Clean complaint record', text: 'No unresolved pattern of payout complaints.' },
] as const

function Tick() {
  return (
    <span aria-hidden className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-gold">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  )
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
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
    twitter: { card: 'summary_large_image', title, description, images: SHARE_IMAGES },
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
    // The bonus TYPES: the chip row under the hero AND the per-type Bonuses
    // section further down, so each type brings its first
    // HOME_BONUSES_PER_CATEGORY offers (one full row of the three-up grid).
    // The chips only read names, marks and counts, which the server counts
    // over the unlimited set. allSettled means a site without the Bonus area
    // renders neither, and falls back to the plain Special offers grid.
    getBonusArea(HOME_BONUSES_PER_CATEGORY),
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
        {/* Hero: the claim on the left, the audit file on the right. */}
        <section className="hero-wash border-b border-line">
          <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-4 pb-[72px] pt-16 sm:pt-20">
            <div className="min-w-0 flex-[1.3_1_540px]">
              <p className="eyebrow">{COPY.home.heroEyebrow}</p>
              <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.02] text-ink sm:text-[clamp(42px,6vw,80px)]">
                {COPY.home.heroHeadline}{' '}
                <em className="block text-gold">{COPY.home.heroHighlight}</em>
              </h1>
              <p className="mt-6 max-w-[480px] text-lg text-muted">{COPY.home.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/casinos" className="btn-gold inline-flex min-h-12 items-center justify-center whitespace-nowrap px-6 text-[15px] font-bold">
                  {COPY.home.featuredCasinos}
                </Link>
                {/* Only when a visible offer exists: a button to an empty page
                    is worse than no button. */}
                {anyOffersVisible && (
                  <Link href="/special-offers" className="btn-line inline-flex min-h-12 items-center justify-center whitespace-nowrap px-6 text-[15px] font-bold">
                    {COPY.home.specialOffers}
                  </Link>
                )}
              </div>
            </div>

            <aside aria-labelledby="listing-checks" className="audit-file mt-7 min-w-0 flex-[1_1_340px] border border-line-soft bg-paper px-[26px] pb-[22px] pt-7 lg:ml-auto lg:max-w-[430px]">
              <h2 id="listing-checks" className="font-display text-[28px] leading-[1.1] text-ink">What a casino must clear to be listed</h2>
              <ul className="mt-[18px]">
                {LISTING_CHECKS.map((check) => (
                  <li key={check.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-t border-line py-3 text-[15px] text-muted">
                    <Tick />
                    <div>
                      <b className="block font-bold text-ink">{check.title}</b>
                      {check.text}
                    </div>
                  </li>
                ))}
              </ul>
              <span className="stamp absolute -bottom-3.5 right-5 bg-cream">FAIL ONE, NOT LISTED</span>
            </aside>
          </div>
        </section>

        {/* The audited list */}
        <section className="py-20" aria-labelledby="top-casinos-heading">
          <div className="mx-auto max-w-[1200px] px-4">
            <p className="eyebrow">Cleared operators</p>
            <h2 id="top-casinos-heading" className="font-display mt-2.5 text-[38px] leading-none text-ink sm:text-[clamp(38px,5vw,62px)]">{COPY.home.topCasinosTitle}</h2>
            <p className="mt-3 max-w-[520px] text-muted">{COPY.home.topCasinosSubtitle}</p>

            {categories.length > 0 && selected && (
              <div className="mt-7"><CategoryNav categories={categories} selected={selected} /></div>
            )}

            {casinos.length === 0 ? (
              <p className="mt-6 text-muted">{COPY.casinos.noResults}</p>
            ) : (
              <ol className={`mt-[26px] ${CASINO_GRID}`}>
                {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} />)}
              </ol>
            )}

            {activeCategory && hasMoreCasinos && (
              <div className="mt-7">
                <Link href={`/categories/${selected}`} aria-label={`See The Full List — ${casinosHeading(activeCategory.name)}`} className="btn-line inline-flex min-h-12 items-center px-6 text-[15px] font-bold">
                  See The Full List →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Bonus categories — renders nothing when the site does not publish
            the Bonus area, so the band collapses rather than leaving a gap. */}
        {bonusSections.length > 0 && (
          <section className="pb-20">
            <div className="mx-auto max-w-[1200px] px-4">
              <BonusCategoryNav sections={bonusSections} />
            </div>
          </section>
        )}

        {/* Bonuses — a shelf per bonus type, built from the same getBonusArea
            payload as the index above and the header/footer menus, so no shelf
            links to a type the menu lacks. A site without the Bonus area keeps
            the flat offers grid instead. */}
        {bonusSections.length > 0 ? (
          <section className="pb-20" aria-labelledby="bonus-heading">
            <div className="mx-auto max-w-[1200px] px-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Fair-wagering offers</p>
                  <h2 id="bonus-heading" className="font-display mt-2.5 text-[38px] leading-none text-ink sm:text-[clamp(38px,5vw,62px)]">{COPY.home.bonus}</h2>
                </div>
                <Link href="/special-offers" aria-label={`${COPY.home.viewAll} bonuses`} className="inline-flex min-h-11 items-center font-bold text-gold hover:text-brand-soft">{COPY.home.viewAll} →</Link>
              </div>
              <BonusShelves sections={bonusSections} />
              <div className="mt-7">
                <Link href="/special-offers" className="btn-line inline-flex min-h-12 items-center px-6 text-[15px] font-bold">
                  {COPY.home.seeAllBonuses} →
                </Link>
              </div>
            </div>
          </section>
        ) : topOffers.length > 0 && (
          <section className="pb-20" aria-labelledby="offers-heading">
            <div className="mx-auto max-w-[1200px] px-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="offers-heading" className="font-display mt-2.5 text-[38px] leading-none text-ink sm:text-[clamp(38px,5vw,62px)]">{COPY.home.specialOffers}</h2>
                <Link href="/special-offers" aria-label={`${COPY.home.viewAll} offers`} className="inline-flex min-h-11 items-center font-bold text-gold hover:text-brand-soft">{COPY.home.viewAll} →</Link>
              </div>
              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topOffers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
              </div>
            </div>
          </section>
        )}

        {/* FAQ — rendered visibly because FAQPage structured data requires it,
            from the same FAQ_ITEMS array the schema is built from. Question on
            the left, answer on the right, from lg. */}
        <section aria-labelledby="faq-heading">
          <div className="mx-auto max-w-[1200px] px-4">
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-heading" className="font-display mt-2.5 text-[38px] leading-none text-ink sm:text-[clamp(38px,5vw,62px)]">{COPY.home.faqTitle}</h2>
            <div className="mt-[30px] border-t border-line">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="grid grid-cols-1 gap-3 border-b border-line py-[30px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-10">
                  <h3 className="faq-q font-display text-[26px] italic leading-[1.15] text-ink sm:text-[30px]">{item.question}</h3>
                  <p className="leading-[1.75] text-muted">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
