import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffer, getBonusCategory } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import BonusTerms from '@/components/BonusTerms'
import { CLAIMABLE_BONUS_CATEGORY } from '@/components/SpecialOfferCard'
import { Stars } from '@/components/CasinoCard'
import { OfferTrack } from '@/components/BonusShelves'
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

/**
 * The offer's own prose, as plain text — the field an editor actually writes.
 *
 * Measured on the live data before this existed: 18 of 29 offers carry no
 * `bonuses` value, and `bonuses` is a column on the GLOBAL `special_offers`
 * row — identical across every domain in the network, with only 8 distinct
 * values across 29 offers. Composed from it, every thin offer's meta
 * description came out as its title plus one sentence repeated on every sibling
 * page. `description` is the only one of the three that is unique per offer.
 */
function plainDescription(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trimmed at a word boundary to the ~155 characters Google renders. */
function metaLength(text: string): string {
  return text.length <= 155 ? text : `${text.slice(0, 155).replace(/\s+\S*$/, '')}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: offer } = await getSpecialOffer(slug)
    // This site's meta title / description, when the admin or the SEO seeder
    // set one (the API already resolves the site's own override over the
    // offer's default); otherwise the composed fallbacks below.
    const title = offer.meta_title?.trim() || offer.title
    /*
     * The written description first; the `bonuses` composition only as a
     * fallback for an offer nobody has written up yet — a content gap this file
     * cannot close, not something to paper over with longer boilerplate.
     */
    const prose = plainDescription(offer.description)
    const metaDescription = offer.meta_description?.trim() ?? ''
    const description = metaDescription !== ''
      ? metaLength(metaDescription)
      : prose !== ''
        ? metaLength(prose)
        : offer.bonuses
          ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
          : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    return {
      title,
      description,
      alternates: { canonical: `/special-offers/${slug}` },
      openGraph: { type: 'article', url: `/special-offers/${slug}`, siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
      // A hidden offer stays reachable by direct link so it can be reviewed,
      // but it must never enter the index. It is already absent from every
      // listing and from the sitemap; this stops a crawler that finds the URL
      // some other way (a shared link, a referrer) from indexing it.
      /*
       * TWO distinct gates.
       *
       * `!active` is the hard one: the offer is withdrawn, the page exists only
       * so an old link does not 404, and `follow: false` keeps it from passing
       * anything onward.
       *
       * `is_indexable` is the editorial one (SpecialOffer::isIndexable): true
       * unless an admin set noindex on this offer. Every other offer page is
       * indexed. `follow` stays true on a noindexed one: its casino and
       * category links are still worth following.
       *
       * The same flag filters the sitemap, so the two can never disagree.
       */
      ...(!offer.active
        ? { robots: { index: false, follow: false } }
        : offer.is_indexable === false
          ? { robots: { index: false, follow: true } }
          : {}),
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function SpecialOfferDetailPage({ params }: Props) {
  const { slug } = await params

  let offer
  try {
    offer = (await getSpecialOffer(slug)).data
  } catch {
    notFound()
  }

  const banner = resolveImageUrl(offer.banner_image ?? offer.image_path)
  // The same rule the cards use: Claim is a property of the bonus TYPE.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY
  const pageUrl = `${SITE_URL}/special-offers/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Special Offers', url: `${SITE_URL}/special-offers` },
      { name: offer.title, url: pageUrl },
    ],
    pageUrl,
  )
  /*
   * `Offer`, and deliberately NOT `SpecialAnnouncement`.
   *
   * SpecialAnnouncement is scoped to public-health and emergency notices;
   * applying it to a casino bonus is schema misuse that risks a manual action
   * rather than a rich result. `Offer` is the type that describes a promotion.
   *
   * ONLY FIELDS WE ACTUALLY HOLD. No `price`, no `priceCurrency`, no
   * `availabilityEnds` — this API exposes none of them, and an Offer carrying an
   * invented figure is worse than no Offer at all. `bonuses` gets no property of
   * its own either: it reads like "100% up to €500", and the Offer properties
   * that take a figure expect a number or a PriceSpecification, not a sentence.
   */
  const offerProse = plainDescription(offer.description)
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: offer.title,
    url: pageUrl,
    ...(offerProse !== ''
      ? { description: offerProse }
      : offer.bonuses
        ? { description: offer.bonuses }
        : {}),
    ...(offer.casino?.name
      ? { offeredBy: { '@type': 'Organization', name: offer.casino.name } }
      : {}),
    ...(offer.bonus_category_name ? { category: offer.bonus_category_name } : {}),
  }

  const graph = [
    buildWebPageSchema({
      name: offer.title,
      url: pageUrl,
      // The prose, not the shared `bonuses` line that is identical network-wide.
      description: offerProse !== '' ? offerProse : (offer.bonuses ?? undefined),
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: offer.updated_at,
    }),
    breadcrumb,
    offerSchema,
  ]

  // Only an offer that is not expired, of the claimable type and with its own
  // link gets the Claim button — the same rule as before, in one place.
  const showClaim = !offer.terms?.expired && claimable && !!offer.affiliate_url
  const facts: Array<[string, string]> = (
    [
      ['Bonus', offer.bonuses],
      ['Wagering', offer.terms?.wagering_requirement ?? null],
      ['Min deposit', offer.terms?.min_deposit ?? null],
    ] as Array<[string, string | null]>
  ).filter((f): f is [string, string] => !!f[1]?.trim())

  // "More <type>": other offers of the same bonus type, from the same cached
  // endpoint /bonuses/<slug> renders. A failure only drops the section.
  const moreOffers = offer.bonus_category_slug
    ? ((await getBonusCategory(offer.bonus_category_slug))?.offers ?? []).filter((o) => o.id !== offer.id).slice(0, 3)
    : []

  const kicker = [offer.casino?.name, offer.bonus_category_name].filter(Boolean).join(' · ')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="mx-auto max-w-[1200px] px-4">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-[22px] text-[13px] text-faint">
          <Link href="/" className="-my-3 inline-block py-3 hover:text-gold">Home</Link>/<Link href="/special-offers" className="-my-3 inline-block py-3 hover:text-gold">Special Offers</Link>/<b className="font-semibold text-muted">{offer.title}</b>
        </nav>

        {/* The banner, laid out as on winpalack: the artwork whole (object-contain)
            in a 16:6 frame straight under the breadcrumb, and nothing at all for
            an offer without artwork. `preload` + `fetchPriority`, not `priority`: in
            Next 16 `priority` emits the preload at the browser's default Low
            priority, and this image is the mobile LCP. */}
        {banner && (
          <div className="relative mt-[22px] aspect-[16/6] overflow-hidden rounded-2xl bg-paper">
            <Image src={banner} alt={offer.title} fill className="object-contain object-center" sizes={BANNER_SIZES} preload fetchPriority="high" />
          </div>
        )}

        {/* Below lg the ticket comes first (order-first), so the Claim button
            sits right under the banner on a phone instead of after the
            description and steps; from lg it is the side column. */}
        <div className="mt-11 flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="min-w-0 lg:flex-[2_1_520px]">
            {kicker && <p className="eyebrow mb-3">{kicker}</p>}
            <h1 className="font-display text-[34px] leading-[1.02] text-ink sm:text-[clamp(34px,4.4vw,54px)]">{offer.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Stars rating={offer.rating} />
              {offer.rating.toFixed(1)}
              {offer.casino && (
                <>
                  {' · Offer by '}
                  <Link href={`/casinos/${offer.casino.slug}`} className="font-bold text-gold hover:text-brand-soft">{offer.casino.name}</Link>
                </>
              )}
            </p>

            {facts.length > 0 && (
              <dl className={`mb-10 mt-7 grid grid-cols-1 overflow-hidden rounded-[18px] border border-line ${['', 'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'][facts.length]}`}>
                {facts.map(([label, value]) => (
                  <div key={label} className="border-b border-line px-[22px] py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">{label}</dt>
                    <dd className={`mt-2 font-display text-[26px] leading-[1.1] ${label === 'Bonus' ? 'text-gold' : 'text-ink'}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {offer.description && (
              <>
                <h2 className="font-display mb-[18px] text-[32px] leading-[1.05] text-ink sm:text-[38px]">About this offer</h2>
                <div className="drop-cap prose max-w-[68ch] prose-p:text-[17px] prose-p:leading-[1.85] prose-p:text-muted prose-headings:text-ink prose-strong:text-ink prose-a:text-gold prose-li:text-muted" dangerouslySetInnerHTML={{ __html: offer.description }} />
              </>
            )}

            {showClaim && (
              <>
                <h2 className="font-display mb-[18px] mt-[34px] text-[32px] leading-[1.05] text-ink sm:text-[38px]">How to claim</h2>
                <ol className="roman-steps">
                  {[
                    `Open ${offer.casino?.name ?? 'the casino'} with the button on this page.`,
                    'Finish registration and verify your account.',
                    'Check the wagering and the cashout cap, then claim the offer as the casino describes it.',
                  ].map((step) => (
                    <li key={step} className="grid grid-cols-[52px_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-3.5 text-muted">
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <aside aria-labelledby="bonus-terms" className="relative order-first mt-3.5 min-w-0 rounded-[20px] border border-line-soft bg-paper p-6 lg:sticky lg:top-24 lg:order-none lg:flex-[1_1_300px]">
            <span className="stamp absolute -top-3.5 right-5 bg-cream" aria-hidden>BEFORE YOU CLAIM</span>
            <h2 id="bonus-terms" className="font-display mt-1.5 text-[28px] text-ink">
              {offer.casino ? `Offer by ${offer.casino.name}` : 'Before you claim'}
            </h2>
            <div className="mt-2">
              {offer.terms && <BonusTerms terms={offer.terms} />}
              <dl>
                <div className="flex justify-between gap-3 py-3 text-[15px]">
                  <dt className="text-faint">Rating</dt>
                  <dd className="text-right font-semibold tabular-nums text-ink">{offer.rating.toFixed(1)}</dd>
                </div>
              </dl>

              {/* An EXPIRED offer keeps its page — the URL stays valid and the
                  terms stay readable — but it must never be presented as
                  claimable: the CTA is replaced with a plain statement, so a
                  visitor who followed an old link understands why there is
                  nothing to press. */}
              {offer.terms?.expired ? (
                <p className="mt-[18px] rounded-xl border border-line-soft bg-ground-2 px-4 py-3 text-sm text-muted">
                  This offer ended
                  {offer.terms.expires_at ? (
                    <> on <time dateTime={offer.terms.expires_at}>{offer.terms.expires_at}</time></>
                  ) : null}
                  . It is no longer available to claim.{' '}
                  <Link href="/special-offers" className="text-gold underline underline-offset-4 hover:text-brand-soft">
                    See current offers
                  </Link>
                </p>
              ) : (
                // Claim belongs to the Special Offers bonus type, matching the
                // cards — see CLAIMABLE_BONUS_CATEGORY in SpecialOfferCard.
                showClaim && (
                  <a href={offer.affiliate_url!} target="_blank" rel="nofollow sponsored noopener" className="btn-gold mt-[18px] flex min-h-12 w-full items-center justify-center px-6 text-[15px] font-bold">
                    {COPY.specialOffers.claim}
                  </a>
                )
              )}
              {offer.casino && (
                <Link href={`/casinos/${offer.casino.slug}`} className="btn-line mt-2.5 flex min-h-12 w-full items-center justify-center px-6 text-[15px] font-bold">
                  Read the full review →
                </Link>
              )}
              <p className="mt-3 text-xs text-faint">18+ · Gamble responsibly.</p>
            </div>
          </aside>
        </div>

        {moreOffers.length > 0 && offer.bonus_category_slug && (
          <section className="mt-[60px]" aria-labelledby="more-offers">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="more-offers" className="font-display text-[32px] leading-[1.05] text-ink sm:text-[40px]">More {offer.bonus_category_name ?? 'offers'}</h2>
              <Link href={`/bonuses/${offer.bonus_category_slug}`} className="inline-flex min-h-11 items-center font-bold text-gold hover:text-brand-soft">View all →</Link>
            </div>
            <OfferTrack offers={moreOffers} className="mt-2" />
          </section>
        )}
      </main>
    </>
  )
}
