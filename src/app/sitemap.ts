import type { MetadataRoute } from 'next'
import { getPage, getBonusArea, getCasinos, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
import { canonicalUrl } from '@/lib/seo/canonical'
import { TRUST_PAGE_SLUGS } from '@/constants/legalPages'


// Guard against missing/invalid timestamps so the sitemap never fails to render.
function safeDate(value: string | null | undefined): Date {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [casinosRes, categoriesRes, offersRes, bonusRes] = await Promise.allSettled([
    getCasinos(),
    getCategories(),
    getSpecialOffers(),
    // The bonus types that have a page on this site. allSettled, so a site
    // without the Bonus area simply contributes no URLs.
    getBonusArea(1),
  ])

  const casinoUrls: MetadataRoute.Sitemap =
    casinosRes.status === 'fulfilled'
      ? casinosRes.value.data.map((c) => ({
          url: `${SITE_URL}/casinos/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
      : []

  // An empty category is noindex (see categories/[slug]), so it is not submitted.
  const categories =
    categoriesRes.status === 'fulfilled' ? categoriesRes.value.data.filter((c) => (c.casinos_count ?? 0) > 0) : []

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categories/${c.slug}`,
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
              url: canonicalUrl(`/categories/${c.slug}`, page),
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

  /*
   * A SITEMAP MUST NOT CONTRADICT A PAGE HEADER.
   *
   * This mapped every offer the endpoint returned. An offer carrying
   * `seo.noindex` was therefore submitted as "index this" while the page itself
   * said "do not" — the exact conflict Search Console reports, and the sitemap
   * loses that argument every time. Same for an inactive offer, whose page
   * serves the stricter `index: false, follow: false`.
   *
   * Both flags are checked here rather than trusted to the endpoint: the list
   * is built for the public site, not for this file, and a sitemap is the one
   * place where being wrong is a signal rather than a glitch.
   */
  const offerUrls: MetadataRoute.Sitemap =
    offersRes.status === 'fulfilled'
      ? offersRes.value.data
          // `is_indexable` and not `seo.noindex`: the server-side rule already
          // folds the admin flag in, and the page's robots tag reads the same
          // flag. One definition, so the sitemap and the header cannot disagree.
          .filter((o) => o.active !== false && o.is_indexable !== false)
          .map((o) => ({
            url: `${SITE_URL}/special-offers/${o.slug}`,
            lastModified: safeDate(o.updated_at),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
      : []

  // /casinos is the unfiltered catalogue and canonicals to itself (see
  // casinos/page.tsx), so it is listed like on every other site. It was once
  // left out because it canonicalised to /categories/<first-category>; that
  // consolidation was undone, and an indexable page missing from the sitemap
  // is the signal that went stale with it.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/casinos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/special-offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  /*
   * THE TRUST PAGES, and only the ones this site actually publishes as
   * indexable.
   *
   * This was `const legalUrls = []` with a comment saying all eleven standard
   * pages are noindex and a sitemap must never contradict a page header. The
   * first half of that is no longer true: six of them are still noindex, but
   * /about, /contact, /responsible-gambling, /affiliate-disclosure and
   * /editorial-policy now carry `index, follow` — Search Console was reporting
   * them as "Excluded by noindex", and on a gambling affiliate they are exactly
   * the pages Google's quality guidance looks for.
   *
   * The second half still holds, which is why this ASKS rather than assumes:
   * each page is fetched and submitted only when the API says it is published
   * and not noindexed. Flip `noindex` on in the admin and the URL leaves this
   * sitemap on the next revalidation, with no deploy and no contradiction.
   *
   * Five cached, tagged fetches — the same `getPage()` the route itself uses,
   * so a warm cache makes this free.
   */
  const trustPages = await Promise.all(
    TRUST_PAGE_SLUGS.map(async (slug) => {
      try {
        const page = await getPage(slug)

        return page !== null && page.noindex !== true ? { slug, page } : null
      } catch {
        // One unreachable page must not empty the whole sitemap.
        return null
      }
    }),
  )

  // `flatMap` with an empty array for the misses, rather than `filter` plus a
  // type predicate: the predicate had to restate the element type, and
  // restating a literal-union slug is how it went out of sync with the source.
  const legalUrls: MetadataRoute.Sitemap = trustPages.flatMap((entry) =>
    entry === null
      ? []
      : [
          {
            url: `${SITE_URL}/${entry.slug}`,
            lastModified: safeDate(entry.page.updated_at),
            changeFrequency: 'monthly' as const,
            priority: 0.4,
          },
        ],
  )

  const bonusUrls: MetadataRoute.Sitemap =
    bonusRes.status === 'fulfilled'
      ? bonusRes.value.map((section) => ({
          url: `${SITE_URL}/bonuses/${section.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          // Below /special-offers (0.9), which is the whole area, and level with
          // a category listing: these are the sections that area is made of.
          priority: 0.8,
        }))
      : []

  return [
    ...staticUrls,
    ...casinoUrls,
    ...categoryUrls,
    ...paginatedCategoryUrls,
    ...offerUrls,
    ...bonusUrls,
    ...legalUrls,
  ]
}
