import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate'
import NewsletterForm from '@/components/NewsletterForm'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import ToastProvider from '@/components/ToastProvider'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo, { LogoMark } from '@/components/Logo'
import { getSocialLinks, hasSpecialOffers, getCategories, getBonusArea } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import NavDropdown from '@/components/NavDropdown'
import FooterNavGroup from '@/components/FooterNavGroup'
import MobileNav from '@/components/MobileNav'
import { resolveImageUrl } from '@/lib/images'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
// Playfair carries the editorial headings, the italic offer lines and the
// roman numerals of the claim steps.
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'] })

/**
 * Subscribe capture: every entry point on this site — the newsletter form and,
 * where the site has one, the timed subscribe modal.
 *
 * The components, the /api/newsletter route and the backend double-opt-in flow
 * are never touched by this; it only decides whether they are rendered. That is
 * the point of a flag rather than deleted markup: turning capture off and back
 * on is one edit, and nothing has to be rebuilt from memory.
 */
const SUBSCRIBE_ENABLED = true

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Viglinksi'

// Both strings live in COPY so this site's wording is defined in exactly one
// place — the same place the page-level titles and descriptions come from.
// The previous SITE_DESCRIPTION here was byte-identical to the one shipped by
// two sibling domains, which made this site's default meta/og/twitter
// description duplicate content on every page that falls back to it.
const SITE_TITLE = `${SITE_NAME} — ${COPY.site.titleTail}`
const SITE_DESCRIPTION = `${SITE_NAME} ${COPY.site.description}`

export const metadata: Metadata = {
  // THE origin every relative canonical and og:url in the app resolves
  // against. `SITE_URL` is validated at module load (see lib/config), so the
  // old `|| 'https://…'` literal is gone: a second hardcoded host here is
  // exactly how the canonical and the sitemap drifted onto different hosts.
  metadataBase: new URL(SITE_URL),
  // Root default. Every page overrides it with its own path, so each URL
  // gets a SELF-referencing canonical rather than inheriting the homepage's.
  alternates: { canonical: '/' },
  title: {
    // Home & inner pages set their own; this is the SEO-friendly fallback title.
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Terms that describe what this site actually publishes. The generic set that
  // was here ("best online casinos", "casino bonuses") was shared with the
  // sibling domains and described none of them in particular.
  keywords: [...COPY.site.keywords, SITE_NAME],
  // Tab icon.
  //
  // This used to offer ONLY icon.svg. Browsers that do not take an SVG favicon
  // — Safari most visibly — then had nothing to fall back to, because
  // /favicon.ico 404'd, so they showed a placeholder or a stale cached icon
  // instead of this site's own mark. app/favicon.ico now holds 16/32/48 rasters
  // cut from that same artwork, and Next links it automatically from the file
  // convention, so it is deliberately NOT repeated here.
  //
  // `apple` DOES have to be listed: an explicit icons object suppresses the
  // apple-icon file convention, so app/apple-icon.tsx was generating a 180x180
  // PNG at /apple-icon that no page ever linked to.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // Relative on purpose: Next resolves it against metadataBase, so og:url
    // and the canonical can never disagree about the host.
    url: '/',
    images: SHARE_IMAGES,
  },
  // The card TYPE only. A title and description here were inherited by every
  // page that does not set `twitter` itself — nearly all of them — so a shared
  // /casinos or /about went out on X under the HOME page's title. With these
  // tags absent, X reads the page's own og:title, og:description and og:image.
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Search-engine ownership verification, supplied per environment. Absent env
  // vars simply produce no tag, so nothing has to be committed to the repo.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION
        ? { 'p:domain_verify': process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION }
        : {}),
    },
  },
}

/**
 * Viewport + theme colour.
 *
 * Next 14 moved these out of `metadata` into their own export; leaving
 * themeColor in `metadata` is silently ignored, which is why the sites had no
 * theme-color at all. `viewport-fit=cover` is deliberately omitted — nothing
 * here draws into the notch area.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17111f',
}

const NAV_LINK = 'flex min-h-11 items-center whitespace-nowrap rounded-full px-[13px] py-[9px] text-[15px] font-semibold text-ink transition-colors hover:bg-paper'

const FOOTER_LINK = 'inline-block -mx-1 px-1 py-1.5 -my-1.5 text-sm text-muted transition-colors hover:text-ink'

const FOOTER_HEAD = 'text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold'

// The 11 legal pages split into the footer's three columns. Every page in
// LEGAL_PAGES lands in exactly one of them.
const FOOTER_EXPLORE = ['about', 'contact']
const FOOTER_LEGAL = ['privacy-policy', 'terms', 'cookie-policy', 'disclaimer']
const FOOTER_POLICIES = ['responsible-gambling', 'affiliate-disclosure', 'editorial-policy', 'aml-policy', 'kyc-policy']

function footerPages(slugs: string[]) {
  return LEGAL_PAGES.filter(({ slug }) => slugs.includes(slug))
}

const NAV_LINKS = [
  { href: '/casinos', label: COPY.nav.casinos },
  { href: '/special-offers', label: COPY.nav.specialOffers },
  { href: '/categories', label: COPY.nav.categories },
]

/** The header dropdown panel, in this site's own palette. */
const NAV_PANEL = {
  panelClassName: 'bg-paper ring-1 ring-line',
  itemClassName: 'text-ink-soft hover:bg-surface hover:text-brand-soft',
  allItemClassName: 'text-ink hover:bg-surface hover:text-brand-soft',
  arrowClassName: 'text-brand',
}

/** The phone and tablet menu (below `lg`), in this site's own palette. */
const NAV_MOBILE = {
  triggerClassName: 'text-ink hover:bg-paper',
  panelClassName: 'bg-paper border-line',
  rowClassName: 'text-ink hover:bg-surface',
  rowExpandedClassName: 'bg-surface text-brand-soft',
  allClassName: 'text-ink hover:bg-surface',
  childClassName: 'text-ink-soft hover:bg-surface hover:text-brand-soft',
  guideClassName: 'border-line',
}

// Audit-seal mark, matching the header Logo, for the footer brand block.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let socialLinks: SocialLink[] = []
  try {
    socialLinks = (await getSocialLinks()).data
  } catch {
    socialLinks = []
  }

  // "Special Offers" only earns its slot in the nav when this site actually has
  // a visible offer to show; with none, the link would lead to an empty page,
  // so both the header and the footer drop it.
  const showSpecialOffers = await hasSpecialOffers()
  const navLinks = NAV_LINKS.filter(({ href }) => href !== '/special-offers' || showSpecialOffers)

  // Children for the Casinos and Bonuses entries, header and footer
  // alike. Each carries the icon its chip shows, resolved here on the server so
  // the client menus never need the storage URL. A failed fetch yields no
  // items, and the entry then stays the plain link it always was.
  const categoryMenuItems = await getCategories()
    .then((res) => res.data.map((c) => ({ slug: c.slug, name: c.name, icon: resolveImageUrl(c.logo_path) })))
    .catch(() => [])
  // Bonus types with at least one visible offer on this site (the API drops
  // empty ones). getBonusArea already falls back to [] on failure.
  const bonusMenuItems = (await getBonusArea()).map((section) => ({
    slug: section.slug,
    name: section.name,
    icon: resolveImageUrl(section.icon_path),
  }))

  // Site-wide structured data, rendered once here so every page carries it.
  // Next.js manages the document <head> (manual <head> tags in a root layout are
  // discouraged), so per the framework's JSON-LD guide the <script> is rendered
  // in the layout body — crawlers read JSON-LD from anywhere in the document.
  // The `<` escaping keeps the payload XSS-safe.
  //
  // Two nodes, cross-referenced by @id: the publisher (Organization) and the
  // site (WebSite). socialLinks is already fetched above for the footer, so
  // `sameAs` costs no extra request.
  const siteGraph = [buildOrganizationSchema(socialLinks), buildWebSiteSchema()]

  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {/* Opens every page at its top — see the component. */}
        <ScrollToTopOnNavigate />
        <ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(siteGraph),
          }}
        />
        <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-[14px]">
          {/* gap-2 below 360px: at 320 the logo and the burger needed 3px more than the row had. */}
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 max-[359px]:gap-2">
            <Logo />
            <nav aria-label="Main navigation" className="hidden lg:block no-scrollbar -mr-4 min-w-0 overflow-x-auto pr-4">
              <ul className="flex items-center gap-0.5" role="list">
                {navLinks.map(({ href, label }) =>
                  href === '/casinos' && categoryMenuItems.length > 0 ? (
                    <NavDropdown key={href} label={label} href={href} allLabel={COPY.nav.allCasinos} itemBasePath="/categories" items={categoryMenuItems} triggerClassName={NAV_LINK} {...NAV_PANEL} />
                  ) : href === '/special-offers' && bonusMenuItems.length > 0 ? (
                    <NavDropdown key={href} label={label} href={href} allLabel={COPY.nav.allOffers} itemBasePath="/bonuses" items={bonusMenuItems} triggerClassName={NAV_LINK} {...NAV_PANEL} />
                  ) : (
                  <li key={href}>
                    <Link href={href} className={NAV_LINK}>
                      {label}
                    </Link>
                  </li>
                ),
                )}
              </ul>
            </nav>
            {/* Below lg the strip above is hidden and this menu replaces it. */}
            <MobileNav
              hideFrom="lg"
              links={navLinks}
              groups={{
                '/casinos': { allLabel: COPY.nav.allCasinos, items: categoryMenuItems, itemBasePath: '/categories' },
                '/special-offers': { allLabel: COPY.nav.allOffers, items: bonusMenuItems, itemBasePath: '/bonuses' },
              }}
              theme={NAV_MOBILE}
            />
          </div>
        </header>

        {/* Newsletter strip — rendered while SUBSCRIBE_ENABLED is true. */}
        {SUBSCRIBE_ENABLED && (
          <section className="border-b border-line" aria-label="Newsletter">
            <div className="mx-auto max-w-[1200px] px-4 py-4">
              <NewsletterForm />
            </div>
          </section>
        )}

        <div className="flex-1">{children}</div>

        <footer className="mt-[72px] border-t border-line bg-night">
          <div className="mx-auto max-w-[1200px] px-4 pb-7 pt-14">
            <div className="flex flex-wrap justify-between gap-10">
              <div className="max-w-[360px] flex-[1_1_260px]">
                <div className="flex items-center gap-3">
                  <LogoMark />
                  <p className="font-display text-[26px] leading-none text-ink">
                    Vig<span className="italic text-gold">linksi</span>
                  </p>
                </div>
                <p className="mt-3.5 text-sm text-muted">{COPY.footer.tagline}</p>
                {socialLinks.length > 0 && (
                  <div className="mt-5">
                    <p className={`${FOOTER_HEAD} mb-2.5`}>Follow us</p>
                    <SocialIcons links={socialLinks} />
                  </div>
                )}
              </div>

              <div className="grid flex-[2_1_480px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-6">
                <div>
                  <p className={FOOTER_HEAD}>Explore</p>
                  <ul className="mt-2.5 flex flex-col gap-2.5">
                    {navLinks.map(({ href, label }) =>
                      href === '/casinos' && categoryMenuItems.length > 0 ? (
                        <FooterNavGroup key={href} label={label} href={href} allLabel={COPY.nav.allCasinos} itemBasePath="/categories" items={categoryMenuItems} linkClassName={FOOTER_LINK} guideClassName="border-line" />
                      ) : href === '/special-offers' && bonusMenuItems.length > 0 ? (
                        <FooterNavGroup key={href} label={label} href={href} allLabel={COPY.nav.allOffers} itemBasePath="/bonuses" items={bonusMenuItems} linkClassName={FOOTER_LINK} guideClassName="border-line" />
                      ) : (
                        <li key={href}>
                          <Link href={href} className={FOOTER_LINK}>{label}</Link>
                        </li>
                      ),
                    )}
                    {footerPages(FOOTER_EXPLORE).map(({ slug, label }) => (
                      <li key={slug}><Link href={`/${slug}`} className={FOOTER_LINK}>{label}</Link></li>
                    ))}
                  </ul>
                </div>
                <nav aria-label="Legal">
                  <p className={FOOTER_HEAD}>Legal</p>
                  <ul className="mt-2.5 flex flex-col gap-2.5">
                    {footerPages(FOOTER_LEGAL).map(({ slug, label }) => (
                      <li key={slug}><Link href={`/${slug}`} className={FOOTER_LINK}>{label}</Link></li>
                    ))}
                    <li>
                      <CookieSettingsButton className={FOOTER_LINK} />
                    </li>
                  </ul>
                </nav>
                <nav aria-label="Policies">
                  <p className={FOOTER_HEAD}>Policies</p>
                  <ul className="mt-2.5 flex flex-col gap-2.5">
                    {footerPages(FOOTER_POLICIES).map(({ slug, label }) => (
                      <li key={slug}><Link href={`/${slug}`} className={FOOTER_LINK}>{label}</Link></li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>

            {/* The 18+ mark with the responsible-play line beside it. Not
                `aria-hidden`: the sentence never says the age. */}
            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-6">
              <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border-[1.5px] border-gold font-extrabold text-gold">18+</span>
              <p className="flex-[1_1_300px] text-sm text-muted">
                <b className="text-ink">Gamble responsibly.</b> {COPY.footer.disclaimer}
              </p>
            </div>

            <div className="mt-[22px] flex flex-wrap justify-between gap-3 text-[13px] text-faint">
              <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
              {/* `not-italic` is load-bearing: the browser default for the tag is italic. */}
              <address className="not-italic">{COPY.footer.postalAddress}</address>
            </div>
          </div>
        </footer>

        <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  )
}
