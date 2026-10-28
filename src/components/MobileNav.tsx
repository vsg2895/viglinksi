'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MenuItemIcon from '@/components/MenuItemIcon'
import type { NavDropdownItem } from '@/components/NavDropdown'

export interface MobileNavLink {
  href: string
  label: string
}

/** Children shown under one top-level entry, keyed in `groups` by that entry's href. */
export interface MobileNavGroup {
  allLabel: string
  items: NavDropdownItem[]
  /** Where each item points, minus the slug: `/categories` or `/bonuses`. */
  itemBasePath: string
}

/** This site's palette for the menu. Passed from the layout, so the component stays identical everywhere. */
export interface MobileNavTheme {
  /** The burger button. */
  triggerClassName: string
  /** The panel surface and its top border. */
  panelClassName: string
  /** A top-level row (link or group toggle), including hover. */
  rowClassName: string
  /** A group toggle while it is expanded. */
  rowExpandedClassName: string
  /** The "All …" row inside a group. */
  allClassName: string
  /** A child row inside a group, including hover. */
  childClassName: string
  /** The guide line down the left of an expanded group. */
  guideClassName: string
}

/**
 * The header menu below `md`, replacing the sideways-scrolling nav strip.
 *
 * On a phone that strip showed one or two items and gave no sign the rest
 * existed — on the narrowest logo layouts not even the first item fitted. This
 * puts every entry in one full-width panel, with Casinos and Bonuses as
 * expandable groups that carry the same icons as the chips and the desktop
 * dropdowns.
 *
 * PORTALLED to <body>: the header carries `backdrop-blur-xl`, and a
 * backdrop-filter makes an element the containing block for its fixed
 * descendants, so a fixed panel rendered in place would be laid out against the
 * header and collapse. The panel opens at the header's measured bottom edge,
 * because headers here are 64px or 72px tall.
 *
 * "Open on this path" state: navigating anywhere closes the menu with no effect
 * and no extra render. Escape, the backdrop and choosing a link close it too, and
 * focus returns to the button. The page behind cannot scroll while it is open.
 */
export default function MobileNav({
  links,
  groups,
  theme,
}: {
  links: MobileNavLink[]
  groups: Record<string, MobileNavGroup>
  theme: MobileNavTheme
}) {
  const pathname = usePathname()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  // Which group is expanded, keyed by its href. One at a time keeps the panel
  // short enough that the links below a group stay on screen.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const panelId = `mobile-nav-${useId()}`
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpenOn(null)
    trigger.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    const el = panel.current
    const button = trigger.current
    if (!el || !button) return

    const place = () => {
      const bottom = button.closest('header')?.getBoundingClientRect().bottom ?? 64
      el.style.top = `${bottom}px`
      // As tall as its content, never taller than the space below the header:
      // a short menu leaves the dimmed page visible, a long one scrolls.
      el.style.maxHeight = `calc(100dvh - ${bottom}px)`
    }
    place()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the PANEL, not the first link: a focus ring on a link the moment the
    // menu opens reads as "already selected" on a touch screen. The first link
    // is still one Tab away.
    el.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenOn(null)
        button.focus()
      }
    }
    window.addEventListener('resize', place)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('resize', place)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const chevron = (expanded: boolean) => (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
    >
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const row = 'flex min-h-12 w-full items-center rounded-xl px-4 text-[17px] font-semibold tracking-tight transition-colors'
  const child = 'flex min-h-11 items-center gap-2.5 rounded-xl px-4 text-[15px] tracking-tight transition-colors'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => {
          // Reopening starts collapsed: a group left open last time would hide
          // the links below it before the reader asked for anything.
          setOpenGroup(null)
          setOpenOn(open ? null : pathname)
        }}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors md:hidden ${theme.triggerClassName}`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="presentation">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={close} />

            <div
              ref={panel}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              tabIndex={-1}
              // Below the header, not over it: the close button stays where the
              // burger was, so the control does not move under the thumb.
              className={`absolute inset-x-0 overflow-y-auto overscroll-contain border-t outline-none shadow-xl ${theme.panelClassName}`}
              style={{ top: 64 }}
            >
              <nav aria-label="Main navigation">
                <ul className="flex flex-col p-2" role="list">
                  {links.map(({ href, label }) => {
                    const group = groups[href]
                    if (!group || group.items.length === 0) {
                      return (
                        <li key={href}>
                          <Link href={href} onClick={close} className={`${row} ${theme.rowClassName}`}>
                            {label}
                          </Link>
                        </li>
                      )
                    }

                    const expanded = openGroup === href
                    const groupId = `${panelId}-${href.replace(/\W/g, '')}`
                    return (
                      <li key={href}>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={expanded ? groupId : undefined}
                          onClick={() => setOpenGroup(expanded ? null : href)}
                          className={`${row} justify-between gap-2 ${expanded ? theme.rowExpandedClassName : theme.rowClassName}`}
                        >
                          {label}
                          {chevron(expanded)}
                        </button>

                        {/* Rendered only while expanded, so a collapsed group keeps
                            its links out of the tab order. The guide line is what
                            says "these belong to this entry". */}
                        {expanded && (
                          <ul id={groupId} role="list" className={`my-1 ml-4 flex flex-col border-l-2 pl-2 ${theme.guideClassName}`}>
                            <li>
                              <Link href={href} onClick={close} className={`${child} font-bold ${theme.allClassName}`}>
                                {group.allLabel}
                              </Link>
                            </li>
                            {group.items.map((item) => (
                              <li key={item.slug}>
                                <Link
                                  href={`${group.itemBasePath}/${item.slug}`}
                                  onClick={close}
                                  className={`${child} font-semibold ${theme.childClassName}`}
                                >
                                  <MenuItemIcon icon={item.icon} />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
