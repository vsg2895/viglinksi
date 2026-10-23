import type { SpecialOfferTerms } from '@shared/types/specialOffer'

/**
 * The terms a player needs before depositing, as labelled figures.
 *
 * A Server Component — pure rendering of already-fetched data, and it is
 * exactly the kind of content that must be in the initial HTML.
 *
 * Every row is conditional. An offer with no confirmed terms renders nothing at
 * all rather than a row of dashes: blanks in a table of figures read as zeros,
 * and "min deposit: —" is worse than no answer, because it looks like one.
 *
 * The full-terms link is rendered HERE, next to the numbers, rather than in a
 * footnote. That is a compliance choice, not a layout one — a wagering
 * requirement stated without a route to the operator's own terms is the pattern
 * regulators object to.
 *
 * Styled from this site's own tokens, never a sibling's literals: the panel is
 * the same component on every domain and must not make two of them look alike.
 *
 * It lives in the detail page's sticky rail, so the figures stay on screen
 * beside the prose rather than below it — see special-offers/[slug]/page.tsx.
 */
export default function BonusTerms({ terms }: { terms: SpecialOfferTerms }) {
  const rows: Array<[string, string]> = []

  const push = (label: string, value: string | null) => {
    const trimmed = (value ?? '').trim()
    if (trimmed !== '') rows.push([label, trimmed])
  }

  push('Wagering', terms.wagering_requirement)
  push('Min deposit', terms.min_deposit)
  push('Max cashout', terms.max_cashout)
  push('Bonus code', terms.bonus_code)

  if (rows.length === 0 && !terms.terms_url && !terms.expires_at) return null

  return (
    <section
      className="rounded-xl border border-line bg-paper p-5"
      aria-labelledby="bonus-terms"
    >
      <h3 id="bonus-terms" className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Before you claim
      </h3>

      {rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="mb-1 text-xs text-muted">
                {label}
              </dt>
              {/* Tabular figures so the numbers line up between one offer and
                  the next and can be compared down a page rather than read one
                  at a time. */}
              <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
        {terms.expires_at && !terms.expired && (
          <span className="text-muted">
            Offer ends{' '}
            <time dateTime={terms.expires_at} className="font-semibold text-ink">
              {new Date(terms.expires_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </span>
        )}
        {terms.terms_url && (
          <a
            href={terms.terms_url}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4 transition-colors hover:text-brand-dark"
          >
            T&amp;Cs apply — read the full terms
          </a>
        )}
      </div>
    </section>
  )
}
