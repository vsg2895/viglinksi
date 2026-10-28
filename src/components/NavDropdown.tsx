'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MenuItemIcon from '@/components/MenuItemIcon'

export interface NavDropdownItem {
  slug: string
  name: string
  /** The category's icon, already resolved to a full URL. Null falls back to a dot. */
  icon?: string | null
}

/** Gap between the panel and the viewport edge, in px. */
const EDGE = 8

/**
 * A header link with its categories as children: Casinos → casino categories,
 * Bonuses → bonus types.
 *
 * ── Why the panel is PORTALLED, not absolute ────────────────────────────────
 *
 * The header nav is an `overflow-x-auto` strip, so it can scroll sideways on a
 * phone. Overflow on one axis clips the other too, so an absolute panel inside
 * it would be cut off at the bottom of the header. The header also carries
 * `backdrop-blur-xl`, and a backdrop-filter makes an element the containing
 * block for fixed descendants, so a fixed panel inside it would be positioned
 * against the header, not the viewport.
 *
 * Rendering the panel into <body> escapes both. It is then `position: fixed`
 * and placed under its button from the button's own rect, clamped so it never
 * runs off the right edge of a narrow screen.
 *
 * ── Closing ─────────────────────────────────────────────────────────────────
 *
 * Open is stored as "open on THIS path", so navigating anywhere closes it with
 * no effect and no extra render. Escape, a click outside both the button and
 * the panel, and choosing an item close it too.
 *
 * The children are real <Link>s, so middle-click and "open in new tab" behave
 * exactly as on a flat menu. With no items the caller renders the plain link
 * instead, so this never opens onto nothing.
 */
export default function NavDropdown({
  label,
  href,
  allLabel,
  items,
  itemBasePath,
  triggerClassName,
  panelClassName,
  itemClassName,
  allItemClassName,
  arrowClassName,
}: {
  label: string
  /** The parent's own destination, kept as the first row. */
  href: string
  allLabel: string
  items: NavDropdownItem[]
  /** Where each item points, minus the slug: `/categories` or `/bonuses`. */
  itemBasePath: string
  /** The site's own header-link classes, so the trigger matches its siblings. */
  triggerClassName: string
  /** Panel surface in the site's palette (background, ring). */
  panelClassName: string
  /** Child row colours, including hover. */
  itemClassName: string
  /** The "All …" row: same as a child, given more weight. */
  allItemClassName: string
  arrowClassName: string
}) {
  const pathname = usePathname()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const panelId = `nav-dropdown-${useId()}`
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Position, listeners and the entry animation. Everything here writes to the
  // DOM directly rather than to state: the panel's place is derived from the
  // button's rect every time, and keeping it out of React means no re-render
  // per scroll event.
  useLayoutEffect(() => {
    if (!open) return
    const el = panel.current
    const trigger = button.current
    if (!el || !trigger) return

    const place = () => {
      const rect = trigger.getBoundingClientRect()
      const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - el.offsetWidth - EDGE))
      el.style.top = `${rect.bottom + 8}px`
      el.style.left = `${left}px`
    }
    place()

    // Animate IN: placed at rest first, then moved to the visible state a frame
    // later, so the browser has something to transition from.
    const frame = requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!el.contains(target) && !trigger.contains(target)) setOpenOn(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenOn(null)
        trigger.focus()
      }
    }

    // Capture, so a sideways scroll of the nav strip moves the panel with it.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <li>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`${triggerClassName} gap-1.5`}
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

      {open &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            // w-max so the panel is as wide as its longest label and never
            // wraps; the max stops it outgrowing a phone screen.
            className={`fixed z-50 w-max min-w-[13rem] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl p-1.5 ${panelClassName}`}
            // The transition is inline rather than a utility: this panel only
            // exists while open, so a class that failed to generate would
            // leave it stuck invisible with no way to notice.
            style={{
              opacity: 0,
              transform: 'translateY(-6px)',
              transition: 'opacity 150ms ease-out, transform 150ms ease-out',
              boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.28), 0 4px 12px -4px rgba(15, 23, 42, 0.1)',
            }}
          >
            <ul role="list">
              <li>
                <Link
                  href={href}
                  onClick={() => setOpenOn(null)}
                  className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors duration-150 ${allItemClassName}`}
                >
                  {allLabel}
                  <span aria-hidden className={arrowClassName}>→</span>
                </Link>
              </li>

              <li aria-hidden className="mx-2 my-1.5 border-t border-current opacity-10" />

              {items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`${itemBasePath}/${item.slug}`}
                    onClick={() => setOpenOn(null)}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${itemClassName}`}
                  >
                    <MenuItemIcon icon={item.icon} />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </li>
  )
}
