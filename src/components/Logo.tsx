import Link from 'next/link'

/**
 * Viglinksi brand logo, from sites/viglinksi-redesign.html: a gold-ringed
 * audit seal holding a check, beside the serif "Viglinksi" wordmark (the
 * second half in gold italic) and the "CASINO INTELLIGENCE" tagline.
 *
 * Same component contract as the sibling sites: one optional `className`. The
 * Link has NO aria-label: its visible text is its accessible name, and a label
 * that did not start with that text failed Lighthouse's
 * label-content-name-mismatch audit.
 */

/** The bare seal. Exported because the footer shows the same artwork. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full border-[1.5px] border-gold"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg ${className}`.trim()}>
      <LogoMark />
      <span className="flex flex-col">
        <span className="font-display text-[26px] leading-none text-ink">
          Vig<span className="italic text-gold">linksi</span>
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-faint">Casino intelligence</span>
      </span>
    </Link>
  )
}
