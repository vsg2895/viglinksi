'use client'

import { useEffect } from 'react'
import { consentChoice } from './CookieConsent'

/**
 * Records a visit to a Special Offer page.
 *
 * RENDERS NOTHING and can fail at every step without the visitor noticing.
 * Every call is wrapped, every promise is allowed to reject, and nothing here
 * is awaited by anything that paints. A tracker that can break a bonus page
 * is worth less than no tracker.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RUNS ON PAGE OPEN, WITHOUT WAITING FOR AN ANSWER — changed 2026-11-27 at the
 * site owner's direction, having previously been gated on `consent === 'all'`.
 *
 * What that changes, stated plainly because the next person to read this will
 * need to know: a visitor who has not touched the banner, or who chose
 * "necessary only", is now recorded. The banner copy and the Privacy Policy
 * were rewritten in the same change so they describe this rather than the old
 * behaviour — if you alter what is collected here, those two have to move with
 * it or the sites are telling visitors something untrue.
 *
 * The lawful basis in the policy is no longer consent but legitimate interest
 * (fraud prevention and knowing where visitors come from). That is a defensible
 * basis for it, and it is not a blank cheque: it is why the answer is still
 * recorded on the row, and why the one exception below exists.
 *
 * THE ONE EXCEPTION: Global Privacy Control. A browser sending GPC is making an
 * explicit, machine-readable "do not track me" statement — unlike a visitor who
 * simply has not clicked anything yet — and the Privacy Policy promises it is
 * honoured. It is a tiny share of traffic, so ignoring it would buy almost no
 * data for real exposure. Remove this only together with that promise.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS DELIBERATELY NOT HERE: WebRTC / STUN candidate harvesting. Its only
 * purpose is to surface an address behind a VPN, which means defeating a
 * privacy measure the visitor chose. VPN *detection* is done server-side from
 * the IP intelligence provider's own verdict, which answers the business
 * question — is this visitor masking their location — without unmasking one.
 * Browsers have also closed the technique: host candidates now come back as
 * mDNS `.local` names, and a full-tunnel VPN's srflx candidate is the VPN.
 */

const PHASE_ONE = '/api/offer-visit'
const PHASE_TWO = '/api/offer-visit/client-ips'

/** Each probe gets its own short budget; a slow one is simply dropped. */
const PROBE_TIMEOUT_MS = 3000

const IPV4_ENDPOINT = process.env.NEXT_PUBLIC_IPV4_ENDPOINT ?? 'https://api.ipify.org?format=json'
const IPV6_ENDPOINT = process.env.NEXT_PUBLIC_IPV6_ENDPOINT ?? 'https://api6.ipify.org?format=json'

type Props = { specialOfferId: number }

/** A public-IP probe. Resolves to null on any failure, including no IPv6. */
async function probe(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      // No cookies to a third party, and no cached answer from a previous
      // network — a stale address is worse than none.
      credentials: 'omit',
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data: unknown = await res.json()

    if (typeof data === 'object' && data !== null && 'ip' in data) {
      const ip = (data as { ip: unknown }).ip
      return typeof ip === 'string' && ip.length > 0 && ip.length <= 45 ? ip : null
    }

    return null
  } catch {
    // The IPv6 probe failing is the NORMAL outcome for most visitors — they
    // have no IPv6 — so this path is not exceptional and is not logged.
    return null
  }
}

function post(url: string, payload: unknown): void {
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Survives the page being closed mid-flight, which is the common case
      // on a bonus page: the visitor clicks through to the operator.
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never surfaces */
  }
}

export default function OfferVisitTracker({ specialOfferId }: Props) {
  useEffect(() => {
    let cancelled = false
    let done = false

    function run(): void {
      // Once per mount, whatever happens afterwards.
      if (done || cancelled) return

      // The explicit opt-out, and the only thing that stops this now.
      if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
        return
      }

      // Read, not obeyed: the answer is stored on the row so an operator can
      // always tell which visits predate a visitor's consent and which follow
      // it. `null` means they had not answered when this was recorded.
      const consent = consentChoice()

      done = true

      // crypto.randomUUID needs a secure context; without it there is no way
      // to address phase 2, so the whole thing is skipped rather than faked
      // with a weaker id that could collide across visitors.
      if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return

      const visitUuid = crypto.randomUUID()

      post(PHASE_ONE, {
        visit_uuid: visitUuid,
        special_offer_id: specialOfferId,
        page_url: window.location.href,
        referer: document.referrer || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        screen: `${window.screen.width}x${window.screen.height}`,
        platform: navigator.platform || null,
        consent,
      })

      // Phase 2, in parallel and entirely optional. `allSettled` so one
      // rejection cannot take the other down.
      void Promise.allSettled([probe(IPV4_ENDPOINT), probe(IPV6_ENDPOINT)]).then((results) => {
        if (cancelled) return

        const [v4, v6] = results.map((r) => (r.status === 'fulfilled' ? r.value : null))

        // Nothing to add — do not spend a request saying so.
        if (!v4 && !v6) return

        post(PHASE_TWO, {
          visit_uuid: visitUuid,
          client_ipv4: v4,
          client_ipv6: v6,
        })
      })
    }

    run()

    return () => {
      cancelled = true
    }
  }, [specialOfferId])

  return null
}
