import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { CasinoWithAttachment } from '@shared/types/casino'

export function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`tracking-[1px] text-gold ${className}`.trim()} role="img" aria-label={`Rated ${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="text-line-soft">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/**
 * The casino's logo on the white tile every logo sits on, so dark
 * and light artwork alike stay legible on the plum ground. With no artwork,
 * the name itself.
 */
export function LogoPaper({ casino, className = '', sizes = '150px' }: { casino: CasinoWithAttachment; className?: string; sizes?: string }) {
  // The casino's "Image" (logo), NOT the wide "Banner Image" (that's used big
  // on the single casino page). Falls back to the banner if no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-white p-3 text-center font-extrabold leading-tight text-cream ${className}`.trim()}>
      {image ? (
        <Image src={image} alt={casino.name} width={300} height={200} sizes={sizes} className="h-auto max-h-full w-auto max-w-full object-contain" />
      ) : (
        casino.name
      )}
    </span>
  )
}

/**
 * One casino on the audited list, from sites/viglinksi-redesign.html: a
 * dossier — the logo on white, then the name, the score, the headline offer in gold italic and the two actions. On hover or
 * keyboard focus it lifts and its AUDITED stamp appears (see `.dossier` in
 * globals.css). Rendered as an <li>, so the <ol> keeps the order.
 *
 * Two layouts from one grid:
 * - phone: the logo as an 88px square beside the name and score, with
 *   the offer and the buttons across the full width below — the logos are
 *   square artwork, and a full-width white band left most of it empty;
 * - from sm: the mockup's dossier — a 150px white logo column down the left,
 *   everything else beside it.
 */
export default function CasinoCard({ casino }: { casino: CasinoWithAttachment; rank?: number }) {
  return (
    <li className="dossier grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-3.5 overflow-hidden rounded-[20px] border border-line bg-ground-2 p-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:gap-0 sm:p-0">
      <div className="relative sm:row-span-2">
        <LogoPaper casino={casino} className="h-[88px] w-[88px] rounded-2xl p-2 sm:h-full sm:min-h-[190px] sm:w-full sm:rounded-none sm:p-3" />
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-1.5 sm:px-[22px] sm:pt-5">
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="font-display text-[26px] leading-none text-ink sm:text-[30px]">
            {casino.name}
          </h3>
          <span className="hidden sm:block" aria-hidden>
            <span className="stamp dossier-stamp">AUDITED</span>
          </span>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Stars rating={casino.rating} />
          {casino.rating.toFixed(1)}
        </p>
      </div>

      <div className="col-span-2 flex min-w-0 flex-col gap-3 sm:col-span-1 sm:col-start-2 sm:px-[22px] sm:pb-5 sm:pt-2.5">
        {casino.bonuses && (
          <p className="font-display text-[22px] italic leading-[1.2] text-gold">{casino.bonuses}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          <a
            href={casino.attachment.affiliate_url}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="btn-gold inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap px-[18px] text-sm font-bold"
          >
            {COPY.casinos.visitCasino}
          </a>
          <Link
            href={`/casinos/${casino.slug}`}
            className="btn-line inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap px-[18px] text-sm font-bold"
          >
            {COPY.casinos.readReview}
          </Link>
        </div>
      </div>
    </li>
  )
}

/** The <ol> classes every list of CasinoCards uses: two dossiers a row from lg. */
export const CASINO_GRID = 'grid grid-cols-1 gap-[18px] lg:grid-cols-2'
