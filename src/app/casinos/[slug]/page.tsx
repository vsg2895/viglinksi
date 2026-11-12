import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getCasinos, getCasino } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import CasinoReviews from '@/components/CasinoReviews'
import CasinoCard, { CASINO_GRID, LogoPaper, Stars } from '@/components/CasinoCard'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/** `sizes` for the page-wide banner: the 1200px container less its 16px gutters. */
const BANNER_SIZES = '(min-width: 1232px) 1168px, calc(100vw - 2rem)'

type Props = { params: Promise<{ slug: string }> }

/*
 * NO generateStaticParams, deliberately — this route renders on demand.
 *
 * Next classifies a dynamic route from what that function RETURNS: a non-empty
 * list builds `f` (dynamic), an EMPTY list builds a fully static route. A
 * static render then throws DYNAMIC_SERVER_USAGE, because the root layout
 * reads the session cookie for the header's account control and a static
 * render may not touch cookies — taking the whole route down with a 500 for
 * every slug, valid or not.
 *
 * Not hypothetical: that is exactly how /special-offers/[slug] broke on the
 * one site with no visible offers. It was reachable here too, because the
 * params lookup failed CLOSED to an empty list, so one API blip was enough to
 * change the build shape.
 *
 * Removing the function pins the route dynamic whatever the data does.
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: casino } = await getCasino(slug)
    const title = casino.meta_title ?? `${casino.name} Review`
    // A casino record is shared by every site, so the fallback must carry THIS
    // site's voice — otherwise all four domains ship the same description for
    // the same casino. An admin-set meta_description still wins, and is shared
    // by design; per-site overrides would need columns on the casino_site pivot.
    // An admin-entered meta_description is shared master data, so this site's
    // short signature is appended rather than the value being used verbatim —
    // otherwise filling the field in the admin would put the identical
    // description back on all four domains. No value set: fall back to the
    // site's own full line.
    const description = casino.meta_description
      ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
      : `${casino.name} — ${COPY.casinos.reviewSummary}`
    // The `title` above is the casino's own meta_title — shared master data, so
    // it is byte-identical on every domain in the network. The share card is
    // where that was most visible: six results, one headline. This site's tail
    // makes the card its own without touching the shared record.
    const shareTitle = `${title} — ${COPY.casinos.reviewTitleTail}`
    // Share cards fell back to the site-wide generated card, so every casino
    // shared identically. The operator's own banner (or logo) is a truthful,
    // page-specific image and needs no extra asset.
    const shareImage = resolveImageUrl(casino.banner_image ?? casino.image_path)
    const images = shareImage
      ? [{ url: shareImage, alt: `${casino.name} — reviewed by ${SITE_NAME}` }]
      : undefined

    return {
      title,
      description,
      alternates: { canonical: `/casinos/${slug}` },
      openGraph: {
        type: 'article',
        url: `${SITE_URL}/casinos/${slug}`,
        siteName: SITE_NAME,
        title: shareTitle,
        description,
        // No banner and no logo: the site card, not an image-less large card.
        images: images ?? SHARE_IMAGES,
      },
      // twitter: was set site-wide but never per review, so X rendered the
      // generic card for every casino.
      twitter: {
        card: 'summary_large_image',
        title: shareTitle,
        description,
        images: shareImage ? [shareImage] : SHARE_IMAGES,
      },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}


/**
 * Resolve a TRUNCATED slug to the real one, or return null.
 *
 * Search Console reported `/casinos/7` as a 404. There is no casino "7" and
 * there never was: slugs come from the operator name via spatie/sluggable, and
 * not one of them is numeric. What does exist is `7-bit-casino` — and cutting
 * that at its first hyphen gives exactly the URL that was crawled. Email
 * clients, chat apps and some link parsers end a URL at punctuation, so a
 * hyphenated slug is the one shape that reliably arrives truncated.
 *
 * A PREFIX, and only up to the hyphen. `startsWith(fragment + '-')` means the
 * fragment has to end where a slug segment ends, so `/casinos/7` can reach
 * `7-bit-casino` but `/casinos/bit` cannot reach `bitstarz` — that would be
 * guessing at a substring rather than restoring a cut.
 *
 * EXACTLY ONE MATCH, or nothing. With `7-bit-casino` and a hypothetical
 * `7-bit-casino-vip` both present, `/casinos/7` is genuinely ambiguous and a
 * redirect would be picking one on the visitor's behalf. Ambiguity falls
 * through to the 404, which is the honest answer.
 *
 * Costs nothing on the happy path: it is only reached when `getCasino()` has
 * already failed, and `getCasinos()` is the same cached, `casinos`-tagged fetch
 * the listing and the sitemap use.
 */
async function resolveTruncatedSlug(fragment: string): Promise<string | null> {
  // A fragment that already contains a hyphen is not a cut at a segment
  // boundary — it is just a wrong slug. Bail before spending the fetch.
  if (fragment === '' || fragment.includes('-')) return null

  try {
    const { data: casinos } = await getCasinos()
    const matches = casinos.filter((c) => c.slug.startsWith(`${fragment}-`))

    return matches.length === 1 ? matches[0].slug : null
  } catch {
    // The list being unreachable must not turn a 404 into a 500.
    return null
  }
}

export default async function CasinoDetailPage({ params }: Props) {
  const { slug } = await params

  let casino
  try {
    casino = (await getCasino(slug)).data
  } catch {
    /*
     * Before 404ing, try the one recoverable case: a slug truncated at a
     * hyphen. `permanentRedirect` is a 308, not a 301 — the App Router cannot
     * set an arbitrary status from a page, and 308 is the permanent redirect
     * that preserves the method. Google treats the two identically for
     * canonicalisation, so the signal is the same one a 301 would send.
     */
    const real = await resolveTruncatedSlug(slug)

    if (real !== null) permanentRedirect(`/casinos/${real}`)

    notFound()
  }

  const banner = resolveImageUrl(casino.banner_image)
  const pageUrl = `${SITE_URL}/casinos/${slug}`
  const categoryNames = (casino.categories ?? []).map((c) => c.name)
  const liveOffers = (casino.special_offers ?? []).length
  // "More audited casinos": the next two in this site's list, each with its
  // real rank there (two, so the two-up grid has no gap). The same cached,
  // `casinos`-tagged fetch the listing uses; unreachable, the section is left out.
  const others = await getCasinos()
    .then(({ data }) =>
      data
        .map((c, i) => ({ c, rank: i + 1 }))
        .filter(({ c }) => c.slug !== casino.slug)
        .slice(0, 2),
    )
    .catch(() => [])
  const reviewSchema = buildCasinoReviewSchema(casino)
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Casinos', url: `${SITE_URL}/casinos` },
      { name: casino.name, url: pageUrl },
    ],
    pageUrl,
  )
  // One graph per page: the WebPage node anchors this URL into the site graph
  // and points at its own breadcrumb, so the review and the trail are read as
  // parts of one page rather than three unrelated blocks.
  const graph = [
    buildWebPageSchema({
      name: `${casino.name} Review`,
      url: pageUrl,
      // Same composition as the <meta> description in generateMetadata. Passing
      // the raw shared `meta_description` here put an identical WebPage
      // description on all six domains for the same casino.
      description: casino.meta_description
        ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
        : `${casino.name} — ${COPY.casinos.reviewSummary}`,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: casino.updated_at,
    }),
    breadcrumb,
    reviewSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="mx-auto max-w-[1200px] px-4">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-[22px] text-[13px] text-faint">
          <Link href="/" className="-my-3 inline-block py-3 hover:text-gold">Home</Link>/<Link href="/casinos" className="-my-3 inline-block py-3 hover:text-gold">Casinos</Link>/<b className="font-semibold text-muted">{casino.name}</b>
        </nav>

        {/* The banner, laid out as on winpalack: the artwork whole (object-contain)
            in a 16:5 frame straight under the breadcrumb, and nothing at all for
            a casino without artwork. `preload` + `fetchPriority`, not `priority`: in
            Next 16 `priority` emits the preload at the browser's default Low
            priority, and this image is the mobile LCP. */}
        {banner && (
          <div className="relative mt-[22px] aspect-[16/5] overflow-hidden rounded-2xl bg-paper">
            <Image src={banner} alt={`${casino.name} banner`} fill className="object-contain object-center" sizes={BANNER_SIZES} preload fetchPriority="high" />
          </div>
        )}

        {/* The ID card: logo, name, score and offer, with the CTA at the end of
            the row from lg (under the rest below it). */}
        <div className="mt-7 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-5 gap-y-4 rounded-[22px] border border-line-soft bg-paper p-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:p-6 lg:grid-cols-[140px_minmax(0,1fr)_auto]">
          <LogoPaper casino={casino} className="h-[88px] w-[88px] rounded-2xl p-2 sm:h-[120px] sm:w-[120px] lg:h-[140px] lg:w-[140px]" sizes="140px" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-[34px] leading-none text-ink sm:text-[44px]">{casino.name}</h1>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Stars rating={casino.rating} />
              {casino.rating.toFixed(1)}
            </p>
            {casino.bonuses && <p className="font-display text-[22px] italic leading-[1.2] text-gold sm:text-[24px]">{casino.bonuses}</p>}
          </div>
          <a href={casino.attachment.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="btn-gold col-span-2 inline-flex min-h-12 items-center justify-center whitespace-nowrap px-8 text-[15px] font-bold lg:col-span-1">
            {COPY.casinos.visitCasino}
          </a>
        </div>

        {/*
          The facts an answer engine has to dig out of the prose otherwise: the
          score, how many offers are live and where the operator sits in the
          catalogue. Every value is read from the record, and the same figures
          appear in the Review and WebPage nodes above, so markup and visible
          text cannot disagree.
        */}
        <section className="mt-11" aria-labelledby="at-a-glance">
          <h2 id="at-a-glance" className="font-display text-[32px] leading-[1.05] text-ink sm:text-[38px]">
            {casino.name} {COPY.casinos.glanceHeadingTail}
          </h2>
          <dl className="mt-7 grid grid-cols-1 overflow-hidden rounded-[18px] border border-line sm:grid-cols-3">
            <div className="border-b border-line px-[22px] py-5 sm:border-b-0 sm:border-r">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">{COPY.casinos.rating}</dt>
              <dd className="mt-2 font-display text-[26px] leading-[1.1] text-ink">{casino.rating} out of 5</dd>
            </div>
            <div className="border-b border-line px-[22px] py-5 sm:border-b-0 sm:border-r">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">Offers listed</dt>
              <dd className="mt-2 font-display text-[26px] leading-[1.1] text-ink">{liveOffers} {liveOffers === 1 ? 'offer' : 'offers'} on this page</dd>
            </div>
            <div className="px-[22px] py-5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">Listed under</dt>
              <dd className="mt-2 font-display text-[26px] leading-[1.1] text-ink">{categoryNames.length} {categoryNames.length === 1 ? 'category' : 'categories'}</dd>
            </div>
          </dl>
        </section>

        <div className="mt-11 flex flex-wrap items-start gap-10">
          <div className="min-w-0 flex-[2_1_520px]">
            {casino.description && (
              <>
                <h2 className="font-display mb-[18px] text-[32px] leading-[1.05] text-ink sm:text-[38px]">The audit</h2>
                <div className="drop-cap prose max-w-[68ch] prose-p:text-[17px] prose-p:leading-[1.85] prose-p:text-muted prose-headings:text-ink prose-strong:text-ink prose-a:text-gold prose-li:text-muted" dangerouslySetInnerHTML={{ __html: casino.description }} />
              </>
            )}

            {casino.categories && casino.categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {casino.categories.map((c) => (
                  <Link key={c.id} href={`/categories/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-line-soft px-3.5 text-sm font-semibold text-muted transition-colors hover:border-gold hover:text-ink">{c.name}</Link>
                ))}
              </div>
            )}

            <CasinoSpecialOffers offers={casino.special_offers ?? []} />

            {/* Renders nothing at all until this site's "Visitor reviews"
                switch is on in the admin — the component gates itself on the
                endpoint's 404, so no per-site conditional is needed here. */}
            <CasinoReviews casinoSlug={casino.slug} casinoName={casino.name} />
          </div>

          {/* The audit summary: the record's own figures under the AUDITED
              stamp, sticky beside the review from lg. */}
          <aside aria-labelledby="audit-summary" className="relative mt-3.5 min-w-0 flex-[1_1_300px] rounded-[20px] border border-line-soft bg-paper p-6 lg:sticky lg:top-24">
            <span className="stamp absolute -top-3.5 right-5 bg-cream" aria-hidden>AUDITED</span>
            <h2 id="audit-summary" className="eyebrow">Audit summary</h2>
            <dl className="mt-2.5">
              <div className="flex justify-between gap-3 border-b border-line py-3 text-[15px]">
                <dt className="text-faint">{COPY.casinos.rating}</dt>
                <dd className="text-right font-bold text-ink">{casino.rating} / 5</dd>
              </div>
              {casino.bonuses && (
                <div className="flex justify-between gap-3 border-b border-line py-3 text-[15px]">
                  <dt className="text-faint">Welcome offer</dt>
                  <dd className="text-right font-bold text-gold">{casino.bonuses}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-b border-line py-3 text-[15px]">
                <dt className="text-faint">Offers listed</dt>
                <dd className="text-right font-bold text-ink">{liveOffers}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line py-3 text-[15px]">
                <dt className="text-faint">Listed under</dt>
                <dd className="text-right font-bold text-ink">{categoryNames.length} {categoryNames.length === 1 ? 'category' : 'categories'}</dd>
              </div>
            </dl>
            <a href={casino.attachment.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="btn-gold mt-[18px] flex min-h-12 w-full items-center justify-center px-6 text-[15px] font-bold">
              {COPY.casinos.visitCasino}
            </a>
            <p className="mt-3 text-xs text-faint">18+ · T&amp;Cs apply.</p>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-[60px]" aria-labelledby="other-casinos">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="other-casinos" className="font-display text-[32px] leading-[1.05] text-ink sm:text-[40px]">More audited casinos</h2>
              <Link href="/casinos" className="inline-flex min-h-11 items-center font-bold text-gold hover:text-brand-soft">See all →</Link>
            </div>
            <ol className={`mt-6 ${CASINO_GRID}`}>
              {others.map(({ c, rank }) => <CasinoCard key={c.id} casino={c} rank={rank} />)}
            </ol>
          </section>
        )}
      </main>
    </>
  )
}
