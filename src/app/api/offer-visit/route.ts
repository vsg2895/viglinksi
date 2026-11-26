import { NextRequest, NextResponse } from 'next/server'

/**
 * Phase 1 of Special Offer visit tracking.
 *
 * WHY A PROXY AT ALL. `API_SITE_KEY` is server-only and must never reach a
 * browser, and `navigator.sendBeacon` cannot set a custom header anyway — so
 * the page cannot call the Laravel endpoint itself. It posts here, same
 * origin, and this handler adds the key.
 *
 * THE PART THAT IS EASY TO GET WRONG: this runs on the Next server, so
 * without the forwarding below Laravel would record THIS server's address for
 * every visitor on the site — one row per page view, all identical, all
 * useless. The visitor's own headers are copied across, and Laravel believes
 * them because the Next server is inside the trusted ranges in
 * backend/config/proxies.php. Anything NOT in that list is ignored upstream,
 * which is what stops this forwarding becoming a way to forge an address.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = process.env.API_URL
const KEY = process.env.API_SITE_KEY

/**
 * The headers that carry the visitor's address, forwarded verbatim.
 *
 * `x-forwarded-for` is APPENDED to rather than replaced: the chain that
 * reached this server is part of the evidence, and overwriting it would throw
 * away the hop that matters.
 */
const FORWARD_HEADERS = [
  'cf-connecting-ip',
  'cf-ipcountry',
  'true-client-ip',
  'x-real-ip',
  'x-client-ip',
  'forwarded',
  'via',
  'user-agent',
  'accept-language',
  'referer',
]

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    // 204, not 500: tracking is never worth showing a visitor an error, and
    // the page ignores the response either way.
    return new NextResponse(null, { status: 204 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const headers: Record<string, string> = {
    'X-Site-Key': KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers[name] = value
  }

  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor

  try {
    const res = await fetch(`${API}/sites/${SITE}/special-offer-visits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // Tracking must never hold a response open.
      signal: AbortSignal.timeout(4000),
    })

    return new NextResponse(null, { status: res.ok ? 204 : 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
