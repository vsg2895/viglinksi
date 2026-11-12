'use client'

import { useState } from 'react'
import { COPY } from '@/constants/copy'
import { useToast } from '@/components/ToastProvider'
import { isValidEmail } from '@/lib/email'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [website, setWebsite] = useState('')
  // A domain-typo correction from SendGrid, e.g. user@gmial.com -> gmail.com.
  // The ONLY validation detail ever shown to a visitor: it is about their own
  // address, and it turns a dead form into a corrected signup.
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null)
  const toast = useToast()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!isValidEmail(email)) {
      toast('Please enter a valid email address.', 'error')
      return
    }
    setLoading(true)
    setSuggestedEmail(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      if (!res.ok) {
        // Surface backend validation (e.g. 422 "You are already subscribed.").
        const data = (await res.json().catch(() => ({}))) as {
          message?: string
          errors?: { email?: string[] }
          suggested_email?: string | null
        }

        setSuggestedEmail(data.suggested_email ?? null)
        toast(data.errors?.email?.[0] ?? data.message ?? COPY.newsletter.error, 'error')
        return
      }
      // The API reports whether a verification email is actually going out
      // (`email_sent` mirrors the site's newsletter_emails_enabled switch).
      // Telling someone to watch their inbox — and dig through spam — for mail
      // this site is not sending would be a worse failure than not collecting
      // the address at all.
      const { email_sent: emailSent } = (await res.json().catch(() => ({}))) as { email_sent?: boolean }

      // Keep the form in place; confirm via a top-corner toast.
      toast(emailSent === false ? COPY.newsletter.successNoEmail : COPY.newsletter.success, 'success')
      setEmail('')
    } catch {
      toast(COPY.newsletter.error, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-[1_1_360px]">
        <p className="font-display text-[21px] leading-[1.1] text-ink">{COPY.newsletter.title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{COPY.newsletter.subtitle}</p>
      </div>

      <div className="w-full min-w-0 flex-[0_1_430px]">
        {/* One pill holding the field and the button; the pill takes the focus ring. */}
        <form onSubmit={onSubmit} className="relative flex rounded-full border border-line-soft bg-ground-2 p-1 focus-within:border-gold">

          {/* HONEYPOT. Never shown, never focusable, never autofilled — a human
              cannot reach it, a naive bot fills every field it finds. The server
              rejects any request that carries a value, before the site is
              touched and long before a paid validation credit could be spent.
              Positioned off-screen rather than display:none, which some bots
              skip. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            // Hidden by an INLINE STYLE, deliberately not by a Tailwind class.
            // The class was a real bug: utility CSS can load late, fail, or be
            // purged, and for as long as it is missing this renders as an
            // ordinary focusable text input sitting in the middle of the
            // subscribe form. A person who types into it gets their signup
            // rejected as a bot — an anti-bot measure silently turning away the
            // humans it exists to protect. An inline style travels inside the
            // HTML, so it cannot desync from the markup that carries it.
            //
            // Still off-screen rather than display:none or the hidden
            // attribute: a honeypot only works while a bot believes the field
            // is real, and the obvious ways of hiding it are the ways a bot
            // checks for. pointer-events:none means that even a rendering
            // accident cannot let a human click into it.
            style={{
              position: 'absolute',
              left: '-9999px',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={COPY.newsletter.placeholder}
            className="h-[42px] w-full min-w-0 flex-1 bg-transparent px-4 text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-gold min-h-[42px] shrink-0 px-5 text-sm font-bold disabled:opacity-60"
          >
            {loading ? COPY.newsletter.checking : COPY.newsletter.button}
          </button>
        </form>

        {/* One click swaps the address in and resubmits. The corrected address
            is a DIFFERENT cache key upstream, so it gets its own validation
            call rather than reusing the typo's verdict. */}
        {suggestedEmail && (
          <p className="mt-2 text-sm">
            Did you mean{' '}
            <button
              type="button"
              onClick={() => { setEmail(suggestedEmail); setSuggestedEmail(null) }}
              className="font-semibold underline underline-offset-2"
            >
              {suggestedEmail}
            </button>
            ?
          </p>
        )}
      </div>
    </div>
  )
}
