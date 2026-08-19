import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

// Resolved by lib/config: falls back to this site's real domain in a
// production build even when NEXT_PUBLIC_SITE_URL is not passed in.
// Reading the bare env var yielded '' there, which silently emitted
// relative URLs — invalid in both a sitemap and JSON-LD.
const BASE_URL = SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
