import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories } from '@/lib/api'
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.categories.pageTitle,
    description: COPY.categories.pageDescription,
    alternates: { canonical: `/categories` },
    openGraph: { type: 'website', url: `/categories`, siteName: SITE_NAME, title: COPY.categories.pageTitle, description: COPY.categories.pageDescription },
  }
}

export default async function CategoriesPage() {
  const res = await getCategories()
  const categories = res.data

  const pageUrl = `${SITE_URL}/categories`

  // A WebPage node anchors the page into the site graph; the breadcrumb gives
  // it a place in the hierarchy; the ItemList describes what the page actually
  // is — an enumeration of the categories rendered below. Without the list the
  // page declared itself as generic prose while visibly being an index.
  const graph = [
    buildWebPageSchema({
      name: COPY.categories.pageTitle,
      url: pageUrl,
      description: COPY.categories.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    buildBreadcrumbSchema(
      [
        { name: 'Home', url: SITE_URL },
        { name: COPY.nav.categories, url: pageUrl },
      ],
      pageUrl,
    ),
    buildItemListSchema(
      COPY.categories.pageTitle,
      pageUrl,
      categories.map((c, i) => ({
        position: i + 1,
        name: c.name,
        url: `${SITE_URL}/categories/${c.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <main className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-ink">{COPY.categories.pageTitle}</h1>
          <p className="mt-2 text-muted">{COPY.categories.pageDescription}</p>
        </header>
        {categories.length === 0 ? (
          <p className="text-muted">{COPY.categories.noResults}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="block rounded-2xl border border-line bg-paper p-6 text-center font-semibold text-ink shadow-sm hover:border-brand hover:text-brand transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
    </>
  )
}
