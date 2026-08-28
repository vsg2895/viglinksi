import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { CasinoWithAttachment } from '@shared/types/casino'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-gold' : 'text-line-soft'} aria-hidden>★</span>
      ))}
    </span>
  )
}

// Viglinksi — audit review row: a serif rank numeral, a prominent brand
// logo, then only the three things that matter (name · rating · bonus) and a
// clear crimson primary CTA. No rank chip, no category clutter.
export default function CasinoCard({ casino, rank }: { casino: CasinoWithAttachment; rank?: number }) {
  // Card shows the casino's "Image" (logo), NOT the wide "Banner Image" (that's
  // used big on the single casino page). Falls back to the banner if no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  return (
    <li className="group flex flex-col gap-4 rounded-2xl bg-paper p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)] sm:h-36 sm:flex-row sm:items-center sm:gap-7">
      {/* Rank numeral + prominent logo */}
      <div className="flex items-center gap-4 sm:gap-5">
        {rank != null && (
          <span
            className="w-6 shrink-0 text-center font-display text-3xl font-semibold leading-none tabular-nums text-brand sm:w-8"
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
        )}
        <div className="flex-shrink-0">
          {image ? (
            // Directly-sized image (NO `fill`) → renders at exactly 160×96.
            <Image
              src={image}
              alt={casino.name}
              width={320}
              height={192}
              sizes="160px"
              className="h-24 w-40 rounded-xl border border-line bg-white ring-1 ring-line"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span className="grid h-24 w-40 place-items-center rounded-xl border border-line bg-cream text-2xl font-bold text-brand" aria-label={casino.name}>
              {casino.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* The three things that matter */}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">{casino.name}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          <Stars rating={casino.rating} />
          <span className="text-sm font-semibold text-muted">{casino.rating.toFixed(1)}</span>
        </div>
        {casino.bonuses && (
          <p className="mt-2 line-clamp-2 text-[15px] font-bold text-win">{casino.bonuses}</p>
        )}
      </div>

      {/* CTAs — Visit is primary, Read Review secondary */}
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-shrink-0">
        <a
          href={casino.attachment.affiliate_url}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="rounded-xl bg-gradient-to-b from-brand-soft to-brand-dark px-8 py-3 text-center text-sm font-bold text-black shadow-md shadow-brand/25 transition-transform hover:-translate-y-0.5 sm:min-w-[150px]"
        >
          {COPY.casinos.visitCasino}
        </a>
        <Link
          href={`/casinos/${casino.slug}`}
          className="rounded-xl border border-line-soft bg-paper px-8 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:border-brand hover:text-brand"
        >
          {COPY.casinos.readReview}
        </Link>
      </div>
    </li>
  )
}
