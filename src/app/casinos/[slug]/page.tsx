import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCasinos, getCasino } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import { COPY } from '@/constants/copy'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const res = await getCasinos()
  return res.data.map((c) => ({ slug: c.slug }))
}

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
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/casinos/${slug}` },
      openGraph: { type: 'article', url: `${SITE_URL}/casinos/${slug}`, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CasinoDetailPage({ params }: Props) {
  const { slug } = await params

  let casino
  try {
    casino = (await getCasino(slug)).data
  } catch {
    notFound()
  }

  const banner = resolveImageUrl(casino.banner_image)
  const logo = resolveImageUrl(casino.image_path)
  const pageUrl = `${SITE_URL}/casinos/${slug}`
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
      description: casino.meta_description ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: casino.updated_at,
    }),
    breadcrumb,
    reviewSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-faint">
            <Link href="/" className="hover:text-brand">Home</Link> / <Link href="/casinos" className="hover:text-brand">Casinos</Link> / <span className="text-ink-soft">{casino.name}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/5] overflow-hidden rounded-2xl bg-cream">
              <Image src={banner} alt={`${casino.name} banner`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <header className="flex items-center gap-4">
            {logo && <Image src={logo} alt={`${casino.name} logo`} width={64} height={64} className="rounded object-contain" />}
            <div>
              <h1 className="font-display text-4xl font-semibold text-ink">{casino.name}</h1>
              <p className="mt-1 text-gold" aria-label={`${casino.rating} out of 5`}>{'★'.repeat(casino.rating)}<span className="text-line-soft">{'★'.repeat(5 - casino.rating)}</span></p>
            </div>
          </header>

          {casino.bonuses && (
            <p className="mt-4 rounded-xl bg-win-bg px-5 py-4 text-lg font-bold text-win">{casino.bonuses}</p>
          )}

          <a href={casino.attachment.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="mt-6 inline-block rounded-xl bg-gradient-to-b from-brand-soft to-brand-dark px-10 py-4 font-bold text-black shadow-md shadow-brand/25 transition-transform hover:-translate-y-0.5">
            {COPY.casinos.visitCasino}
          </a>

          {casino.description && (
            <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: casino.description }} />
          )}

          {casino.categories && casino.categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {casino.categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full bg-cream px-4 py-1.5 text-sm text-ink-soft transition-colors hover:bg-brand/10 hover:text-brand">{c.name}</Link>
              ))}
            </div>
          )}

          <CasinoSpecialOffers offers={casino.special_offers ?? []} />
        </div>
      </main>
    </>
  )
}
