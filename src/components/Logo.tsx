import Link from 'next/link'

/**
 * Viglinksi brand logo: a gold audit seal (ring + check) next to the "Viglinksi"
 * wordmark and the "CASINO INTELLIGENCE" tagline, both taken from the design in
 * sites/Viglinksi.html.
 *
 * Same component contract as the sibling sites — one optional `className`, the
 * Link carries the accessible name, the artwork is aria-hidden so a screen
 * reader announces the destination once rather than twice. Inlined SVG so it
 * renders instantly, scales crisply and costs no extra request.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Viglinksi home"
      className={`inline-flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {/* Audit seal */}
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-md shadow-black/40"
        style={{ background: 'radial-gradient(circle at 30% 25%, #3a2352 0%, #1e1729 70%)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" role="presentation">
          <circle cx="12" cy="12" r="9" stroke="#e6c37e" strokeWidth="1.6" />
          <path
            d="M8 12.2l2.6 2.6L16 9.4"
            stroke="#e6c37e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span className="font-sans text-[22px] font-bold tracking-tight text-ink">
          Vig<span className="text-brand">linksi</span>
        </span>
        <span className="mt-[3px] text-[10px] font-medium tracking-[0.25em] text-faint">
          CASINO INTELLIGENCE
        </span>
      </span>
    </Link>
  )
}
