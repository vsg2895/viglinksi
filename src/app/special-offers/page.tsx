import type { Metadata } from 'next'
import { getSpecialOffers } from '@/lib/api'
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { COPY } from '@/constants/copy'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.specialOffers.pageTitle,
    description: COPY.specialOffers.pageDescription,
    alternates: { canonical: `/special-offers` },
    openGraph: { type: 'website', url: `/special-offers`, siteName: SITE_NAME, title: COPY.specialOffers.pageTitle, description: COPY.specialOffers.pageDescription },
  }
}

export default async function SpecialOffersPage() {
  const res = await getSpecialOffers()
  const offers = res.data

  const pageUrl = `${SITE_URL}/special-offers`

  // WebPage + breadcrumb + the list the page visibly is. Only the offers the
  // API returned are enumerated, and the public endpoint already excludes
  // hidden ones — so the markup can never advertise an offer a visitor cannot
  // see, which is the line between structured data and structured-data spam.
  const graph = [
    buildWebPageSchema({
      name: COPY.specialOffers.pageTitle,
      url: pageUrl,
      description: COPY.specialOffers.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    buildBreadcrumbSchema(
      [
        { name: 'Home', url: SITE_URL },
        { name: COPY.nav.specialOffers, url: pageUrl },
      ],
      pageUrl,
    ),
    buildItemListSchema(
      COPY.specialOffers.pageTitle,
      pageUrl,
      offers.map((o, i) => ({
        position: i + 1,
        name: o.title,
        url: `${SITE_URL}/special-offers/${o.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <main className="py-6 px-4 sm:py-12">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-4 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl text-ink">{COPY.specialOffers.pageTitle}</h1>
          <p className="mt-1 text-sm text-muted sm:mt-2 sm:text-base">{COPY.specialOffers.pageDescription}</p>
        </header>
        {offers.length === 0 ? (
          <p className="text-muted">{COPY.specialOffers.noResults}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3">
            {offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
      </main>
    </>
  )
}
