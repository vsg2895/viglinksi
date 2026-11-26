'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'

// Persisted consent record. Bump CONSENT_VERSION to re-prompt everyone after a
// material change to the Cookie Policy.
//
// v2 (2026-11-25) — Special Offer pages now record the visiting address and
// look up its country when consent is given. Everyone who answered under v1
// agreed to a banner that said the opposite ("no analytics"), so their answer
// cannot carry over: the bump re-asks them, and until they answer again
// consentChoice() returns null and the tracker stays off.
const STORAGE_KEY = 'cookie-consent'
const CONSENT_VERSION = 2

type Choice = 'all' | 'necessary'

// A tiny external store lets the banner reflect persisted consent without
// running setState inside an effect (and without a hydration mismatch).
const listeners = new Set<() => void>()

// When true the banner is shown even if consent already exists — set by the
// footer "Cookie settings" link so visitors can review or withdraw consent.
let forced = false

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

// Global Privacy Control: the browser-level "do not sell or share" signal. The
// Privacy Policy says it is honoured as an opt-out, and nothing read it — so a
// visitor who had already said no was still asked, with Accept All on offer.
// It stands in for a "necessary only" answer until the visitor gives one
// themselves; reopening the banner from the footer still lets them choose.
function gpcOptOut(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

// true ⇒ show the banner (first visit, consent version changed, or reopened).
function shouldShow(): boolean {
  if (forced) return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return !gpcOptOut()
    const parsed = JSON.parse(raw) as { v?: number }
    return parsed?.v !== CONSENT_VERSION
  } catch {
    return true
  }
}

// On the server the banner never renders — it's a client-only, first-visit UI.
function shouldShowServer(): boolean {
  return false
}

function recordConsent(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, v: CONSENT_VERSION, ts: Date.now() }))
    // Mirror the choice into a first-party cookie so the server/analytics can read it.
    // `Secure` on https — every live domain — so the record of a visitor's
    // choice never travels over plain http; omitted on a plain-http dev server,
    // where some browsers refuse to set a Secure cookie at all.
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `cookie_consent=${choice}; path=/; max-age=31536000; SameSite=Lax${secure}`
  } catch {
    /* storage unavailable — still dismiss for this session */
  }
  forced = false
  listeners.forEach((notify) => notify())
}

/** Reopen the consent banner — used by the footer "Cookie settings" link. */
/**
 * The visitor's current answer, or null if they have not given one.
 *
 * Exported so that anything consent-gated reads the SAME record the banner
 * writes, rather than parsing localStorage itself and drifting from it the
 * first time CONSENT_VERSION is bumped.
 *
 * GPC is treated as a standing "necessary only": the Privacy Policy says the
 * signal is honoured as an opt-out, so a browser sending it never counts as
 * having accepted, even before the banner is answered.
 */
export function consentChoice(): Choice | null {
  try {
    if (gpcOptOut()) {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return 'necessary'
      const parsed = JSON.parse(raw) as { choice?: Choice; v?: number }
      return parsed?.v === CONSENT_VERSION ? (parsed.choice ?? 'necessary') : 'necessary'
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { choice?: Choice; v?: number }
    return parsed?.v === CONSENT_VERSION ? (parsed.choice ?? null) : null
  } catch {
    // Storage blocked: treat as "no consent given", never as acceptance.
    return null
  }
}

/** Run `cb` whenever the recorded choice changes. Returns an unsubscribe. */
export function onConsentChange(cb: () => void): () => void {
  return subscribe(cb)
}

export function openCookieSettings(): void {
  forced = true
  listeners.forEach((notify) => notify())
}

export default function CookieConsent() {
  const visible = useSyncExternalStore(subscribe, shouldShow, shouldShowServer)

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-paper p-5 shadow-2xl sm:flex sm:items-center sm:gap-6">
        <div className="min-w-0">
          <p id="cookie-consent-title" className="text-sm font-bold text-ink">We value your privacy</p>
          {/* Says what this site really sets. It used to promise analytics "with your
              consent" on a site that loads no analytics at all. A site that adds an
              analytics tag must say so here, in its Cookie Policy (admin → Legal
              identity → Analytics provider) and gate the tag on consent. */}
          <p id="cookie-consent-desc" className="mt-1 text-sm leading-relaxed text-ink-soft">
            No advertising cookies: one essential cookie remembers this choice. If you accept, we also record
            the network address your device connects from when you open a bonus page, and look up which country
            you are visiting from — we use it to understand where our visitors are and to spot fraud. Operators
            you visit through our links set their own cookies.
 Read our{' '}
            <Link href="/cookie-policy" className="font-semibold text-brand underline hover:text-brand">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => recordConsent('necessary')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-soft px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={() => recordConsent('all')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-dark"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
