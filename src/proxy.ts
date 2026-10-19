import { NextResponse, type NextRequest } from 'next/server'
import { canonicalRedirect } from '@/lib/seo/redirects'

/**
 * Canonical-URL enforcement at the edge.
 *
 * NAMED `proxy.ts`, not `middleware.ts`: Next 16 renamed the convention and the
 * old name logs a deprecation warning. The exported function must be named
 * `proxy` (or be the default export).
 *
 * Every rule, and the reasoning for each, lives in lib/seo/redirects.ts — this
 * file is only the Next-shaped wrapper around it. The short version: Google
 * Search Console was reporting hundreds of "Alternate page with proper
 * canonical tag" URLs per domain, all of them query-string variants of pages we
 * linked ourselves, and a canonical tag alone does not stop a crawler spending
 * its budget on them. A 301 does.
 *
 * They CANNOT live in `next.config.ts`: a config redirect re-appends every query
 * parameter its destination did not consume, so a rule stripping `?page=1`
 * would have `page=1` appended back onto its own destination and redirect to
 * itself forever. Middleware is the only layer that can remove a parameter.
 */
export function proxy(request: NextRequest) {
  const canonical = canonicalRedirect(request)

  if (canonical) return NextResponse.redirect(canonical, 301)

  return NextResponse.next()
}

export const config = {
  /**
   * Everything except Next's own internals, the site's API routes and anything
   * with a file extension. A canonical rule only ever targets a page URL, so
   * running this for every image and script request is pure overhead.
   */
  matcher: ['/((?!_next/|api/|.*\\.[\\w]+$).*)'],
}
