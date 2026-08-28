import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

// Viglinksi design: plum panel offer card with a full-bleed banner, green
// bonus chip and a crimson Claim CTA.
export default function SpecialOfferCard({ offer }: { offer: SpecialOffer }) {
  // Full-bleed banner across the top of the card (prefer the wide banner image).
  const preview = resolveImageUrl(offer.banner_image ?? offer.image_path)

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
      <Link href={`/special-offers/${offer.slug}`} className="relative block aspect-video overflow-hidden bg-cream">
        {preview && <Image src={preview} alt={offer.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 400px" />}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-lg font-semibold leading-tight text-ink">{offer.title}</h3>
        {offer.bonuses && <p className="inline-block rounded-lg bg-win-bg px-3 py-1.5 text-sm font-bold text-win">{offer.bonuses}</p>}
        <span className="text-gold" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}<span className="text-line-soft">{'★'.repeat(5 - offer.rating)}</span></span>
        <div className="mt-auto flex gap-2.5 pt-2">
          <Link href={`/special-offers/${offer.slug}`} className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line-soft bg-paper px-3 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:border-brand hover:text-brand">Details</Link>
          {offer.affiliate_url && (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-brand-soft to-brand-dark px-3 py-2.5 text-center text-sm font-bold text-black shadow-md shadow-brand/25 transition-transform hover:-translate-y-0.5">Claim</a>
          )}
        </div>
      </div>
    </article>
  )
}
