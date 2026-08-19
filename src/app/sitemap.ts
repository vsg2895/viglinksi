import type { MetadataRoute } from 'next'
import { getCasinos, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import { LEGAL_PAGES } from '@/constants/legalPages'
import { SITE_URL } from '@/lib/config'

// Resolved by lib/config: falls back to this site's real domain in a
// production build even when NEXT_PUBLIC_SITE_URL is not passed in.
// Reading the bare env var yielded '' there, which silently emitted
// relative URLs — invalid in both a sitemap and JSON-LD.
const BASE_URL = SITE_URL

// Guard against missing/invalid timestamps so the sitemap never fails to render.
function safeDate(value: string | null | undefined): Date {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [casinosRes, categoriesRes, offersRes] = await Promise.allSettled([
    getCasinos(),
    getCategories(),
    getSpecialOffers(),
  ])

  const casinoUrls: MetadataRoute.Sitemap =
    casinosRes.status === 'fulfilled'
      ? casinosRes.value.data.map((c) => ({
          url: `${BASE_URL}/casinos/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
      : []

  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : []

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    lastModified: safeDate(c.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Page 2+ of each category. Those views carry a self-referencing canonical,
  // so they are indexable in their own right — but nothing linked them from
  // the sitemap, leaving every casino past the first page discoverable only by
  // crawling the pagination. One request per category, all cached for an hour
  // on the same `categories` tag the listing already uses.
  const paginatedCategoryUrls: MetadataRoute.Sitemap = (
    await Promise.all(
      categories.map(async (c) => {
        try {
          const { meta } = (await getCategory(c.slug)).data
          const pages: MetadataRoute.Sitemap = []
          for (let page = 2; page <= meta.last_page; page++) {
            pages.push({
              url: `${BASE_URL}/categories/${c.slug}?page=${page}`,
              lastModified: safeDate(c.updated_at),
              changeFrequency: 'weekly',
              priority: 0.4,
            })
          }
          return pages
        } catch {
          // A category that fails to load simply contributes no extra pages;
          // the sitemap must still render.
          return []
        }
      }),
    )
  ).flat()

  const offerUrls: MetadataRoute.Sitemap =
    offersRes.status === 'fulfilled'
      ? offersRes.value.data.map((o) => ({
          url: `${BASE_URL}/special-offers/${o.slug}`,
          lastModified: safeDate(o.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        }))
      : []

  // NOTE — /casinos is deliberately absent. Under the Option B consolidation it
  // canonicalises to /categories/<first-category> (see casinos/page.tsx), and a
  // sitemap should only advertise canonical URLs; listing it asked Google to
  // index a page that immediately points somewhere else. It stays crawlable
  // through the header nav, and every category it can show is listed below.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/special-offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  // The legal / informational pages are linked from every footer but were absent
  // from the sitemap, leaving 11 indexable URLs per site discoverable only by
  // crawling. They change rarely, so a low priority and a monthly frequency.
  const legalUrls: MetadataRoute.Sitemap = LEGAL_PAGES.map(({ slug }) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  }))

  return [
    ...staticUrls,
    ...casinoUrls,
    ...categoryUrls,
    ...paginatedCategoryUrls,
    ...offerUrls,
    ...legalUrls,
  ]
}
