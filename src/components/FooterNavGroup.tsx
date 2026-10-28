'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MenuItemIcon from '@/components/MenuItemIcon'
import type { NavDropdownItem } from '@/components/NavDropdown'

/**
 * A footer link with its categories as children — an inline disclosure, not a
 * floating panel.
 *
 * The header's NavDropdown floats because a sticky bar has no room to grow. A
 * footer is the opposite: nothing below it to obscure, and a panel floating
 * over it would cover the very links the reader is using. So this one expands
 * IN FLOW and the links beneath it move down.
 *
 * The children reuse the footer's own link classes, so they inherit its colours
 * — light or dark footer alike — and differ only in carrying an icon. Rendered
 * only while open, so a collapsed group puts nothing in the tab order.
 *
 * `inline-flex` on the list keeps it as wide as its labels, so the guide line
 * stops at the longest one instead of stretching to the column's edge.
 */
export default function FooterNavGroup({
  label,
  href,
  allLabel,
  items,
  itemBasePath,
  linkClassName,
  guideClassName,
}: {
  label: string
  href: string
  allLabel: string
  items: NavDropdownItem[]
  itemBasePath: string
  /** The site's own footer-link classes, used for the trigger and every child. */
  linkClassName: string
  /** Colour of the left guide line that groups the children under the parent. */
  guideClassName: string
}) {
  const pathname = usePathname()
  // "Open on this path": navigating anywhere collapses it with no effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const panelId = `footer-nav-${useId()}`
  // The footer links are `inline-block`; a second display utility on the same
  // element would fight it, with the winner decided by stylesheet order. Drop
  // it wherever this component lays the link out as a flex row instead.
  const flexLinkClassName = linkClassName.replace(/(^|\s)inline-block(?=\s|$)/g, ' ').trim()

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`${flexLinkClassName} inline-flex items-center gap-1.5`}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* The block wrapper puts the list on its own line under the (inline)
          trigger; the inline-flex list inside still follows the column's
          text alignment. */}
      {open && (
        <div className="mt-3">
        <ul id={panelId} role="list" className={`inline-flex flex-col gap-2 border-l-2 pl-3 text-left ${guideClassName}`}>
          <li>
            <Link href={href} className={`${linkClassName} font-semibold`}>
              {allLabel}
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.slug}>
              <Link href={`${itemBasePath}/${item.slug}`} className={`${flexLinkClassName} inline-flex items-center gap-2`}>
                <MenuItemIcon icon={item.icon} />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        </div>
      )}
    </li>
  )
}
