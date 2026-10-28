'use client'

import { useId, useState, type ReactNode } from 'react'

/**
 * Phone-only hide / show for a block of filter chips.
 *
 * Below `sm` a one-column chip list is a whole screen of buttons before the
 * content it filters, so the visitor may fold it away. It starts OPEN — the
 * chips are the way in, and hiding them by default would hide the choice.
 *
 * Folding is CSS only (`hidden sm:block`): the links stay in the server HTML
 * either way, so nothing a crawler reads depends on this state, and from `sm`
 * up the toggle is not rendered visibly and the content is always shown.
 *
 * The bar takes its look from the caller: each nav passes its own chip
 * classes, so the toggle reads as one more chip in this site's design.
 */
export default function MobileCollapse({
  label,
  count,
  className,
  countClassName,
  actionClassName,
  children,
}: {
  /** What the block holds, e.g. "Casino categories". */
  label: string
  /** How many items are inside, shown beside the label. */
  count?: number
  /** The chip look: shape, height, surface, border, text colour and hover. */
  className: string
  /** The count beside the label. */
  countClassName: string
  /** The "Hide" / "Show" word and its chevron. */
  actionClassName: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const id = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2.5 px-5 text-left sm:hidden ${className} ${open ? 'mb-3' : ''}`}
      >
        <span>{label}</span>
        {typeof count === 'number' && <span className={`tabular-nums ${countClassName}`}>{count}</span>}
        <span className={`ml-auto inline-flex items-center gap-1 ${actionClassName}`}>
          {open ? 'Hide' : 'Show'}
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5l5 5 5-5" />
          </svg>
        </span>
      </button>
      <div id={id} className={open ? undefined : 'hidden sm:block'}>
        {children}
      </div>
    </>
  )
}
