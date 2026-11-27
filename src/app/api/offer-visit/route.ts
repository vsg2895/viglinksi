import { NextRequest, NextResponse } from 'next/server'

/**
 * Phase 1 of Special Offer visit tracking.
 *
 * WHY A PROXY AT ALL. `API_SITE_KEY` is server-only and must never reach a
 * browser, and `navigator.sendBeacon` cannot set a custom header anyway — so
 * the page cannot call the Laravel endpoint itself. It posts here, same
 * origin, and this handler adds the key.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE VISITOR'S ADDRESS TRAVELS AS `X-Visitor-IP`, AND THAT IS NOT ARBITRARY.
 *
 * The first version of this file forwarded `CF-Connecting-IP` and friends
 * verbatim and assumed they would arrive intact. They do not. `API_URL` is the
 * API's PUBLIC hostname, which is itself behind Cloudflare, so the request
 * leaves this server and enters Cloudflare a second time — and Cloudflare
 * always rewrites `CF-Connecting-IP` with the address of whoever called it.
 * That is this server. Every visitor was therefore recorded as the Next.js
 * host: one row, the hosting provider's IP, the datacentre's city.
 *
 * So the address is resolved HERE, from the request the browser actually made,
 * and sent under a name no proxy in the path claims. Laravel gives that header
 * top priority and records it as `site_reported` — see VisitorIpResolver.
 *
 * It is trusted because this call is authenticated with the site key, which
 * only this server holds. That is the same trust the endpoint already extends
 * to everything else in the payload.
 * ────────────────────────────────────────────────────────────────────────────
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = process.env.API_URL
const KEY = process.env.API_SITE_KEY

/** Context headers, forwarded for the audit trail rather than for the address. */
const FORWARD_HEADERS = ['cf-ipcountry', 'user-agent', 'accept-language', 'referer']

/**
 * The visitor's address as THIS request carried it.
 *
 * Cloudflare sets `cf-connecting-ip` on the way IN, where it is correct and is
 * the visitor; it is only the outbound hop that rewrites it. Read it here,
 * while it still means what it says.
 */
function visitorIp(req: NextRequest): string | null {
  const direct = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip')
  if (direct && direct.trim() !== '') return direct.trim()

  // Leftmost entry of the chain is the originating client.
  const chain = req.headers.get('x-forwarded-for')
  if (chain) {
    const first = chain.split(',')[0]?.trim()
    if (first) return first
  }

  return null
}

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    // 204, not 500: tracking is never worth showing a visitor an error, and
    // the page ignores the response either way.
    console.error('[offer-visit] missing env; tracking disabled')

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

  const ip = visitorIp(req)
  if (ip) headers['X-Visitor-IP'] = ip

  try {
    const res = await fetch(`${API}/sites/${SITE}/special-offer-visits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // Tracking must never hold a response open.
      signal: AbortSignal.timeout(4000),
    })

    /*
     * LOUD IN THE CONTAINER LOG, SILENT TO THE VISITOR.
     *
     * The original version swallowed every upstream answer and returned 204
     * regardless, which is right for the visitor and was very wrong for
     * operating the thing: a misconfigured key, a missing migration and a
     * working tracker all looked identical from outside. `docker compose logs
     * web` now names the status.
     */
    if (!res.ok && res.status !== 204) {
      console.error(`[offer-visit] upstream ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
  } catch (e) {
    console.error('[offer-visit] upstream unreachable:', e instanceof Error ? e.message : e)
  }

  return new NextResponse(null, { status: 204 })
}
