import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffer } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

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
    const { data: offer } = await getSpecialOffer(slug)
    const title = offer.title
    // `bonuses` is shared master data, identical on every site — so the site's
    // own line is appended to keep the factual bonus lead while making the
    // description unique per domain.
    const description = offer.bonuses
      ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
      : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    return {
      title,
      description,
      alternates: { canonical: `/special-offers/${slug}` },
      openGraph: { type: 'article', url: `/special-offers/${slug}`, siteName: SITE_NAME, title, description },
      // A hidden offer stays reachable by direct link so it can be reviewed,
      // but it must never enter the index. It is already absent from every
      // listing and from the sitemap; this stops a crawler that finds the URL
      // some other way (a shared link, a referrer) from indexing it.
      ...(offer.active ? {} : { robots: { index: false, follow: false } }),
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
  const pageUrl = `${SITE_URL}/special-offers/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Special Offers', url: `${SITE_URL}/special-offers` },
      { name: offer.title, url: pageUrl },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: offer.title,
      url: pageUrl,
      description: offer.bonuses ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: offer.updated_at,
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-faint">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-brand">Home</Link> / <Link href="/special-offers" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-brand">Special Offers</Link> / <span className="text-ink-soft">{offer.title}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/6] overflow-hidden rounded-2xl bg-cream">
              <Image src={banner} alt={offer.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <h1 className="text-3xl font-bold text-ink">{offer.title}</h1>
          <p className="mt-1 text-gold" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}{'☆'.repeat(5 - offer.rating)}</p>
          {offer.bonuses && <p className="mt-4 rounded-xl bg-win-bg px-4 py-3 text-lg font-semibold text-win">{offer.bonuses}</p>}

          {offer.affiliate_url && (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="mt-6 inline-block rounded-xl bg-brand px-8 py-3.5 font-semibold text-black hover:bg-brand-dark transition-colors">
              {COPY.specialOffers.claim}
            </a>
          )}

          {offer.description && (
            <div className="prose prose-invert mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: offer.description }} />
          )}

          {offer.casino && (
            <p className="mt-8 text-sm text-muted">
              Offer by <Link href={`/casinos/${offer.casino.slug}`} className="font-semibold text-brand hover:underline">{offer.casino.name}</Link>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
