import { NextRequest, NextResponse } from 'next/server'

/**
 * Phase 2: the addresses the page established about its own connection.
 *
 * Same proxy reasoning as phase 1 — see ../route.ts. The visit is addressed
 * by the uuid the page generated, which is why no database id ever reaches
 * the browser.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = process.env.API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return new NextResponse(null, { status: 204 })
  }

  let payload: { visit_uuid?: unknown; client_ipv4?: unknown; client_ipv6?: unknown }
  try {
    payload = await req.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const uuid = typeof payload.visit_uuid === 'string' ? payload.visit_uuid : ''

  // Shape-checked here so a malformed uuid never becomes a path segment.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    await fetch(`${API}/sites/${SITE}/special-offer-visits/${uuid}/client-ips`, {
      method: 'POST',
      headers: {
        'X-Site-Key': KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_ipv4: typeof payload.client_ipv4 === 'string' ? payload.client_ipv4 : null,
        client_ipv6: typeof payload.client_ipv6 === 'string' ? payload.client_ipv6 : null,
      }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    /* tracking never surfaces an error to a visitor */
  }

  return new NextResponse(null, { status: 204 })
}
