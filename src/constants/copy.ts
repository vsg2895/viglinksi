/**
 * All user-facing and SEO-facing wording for this site.
 *
 * The KEY STRUCTURE is identical across idevaffiliation, winpalack, roulettingo
 * and viglinksi — same groups, same keys, same order — so the four apps stay
 * interchangeable and a component written for one works on all of them.
 *
 * The WORDS are unique to this site. That is not decoration: the brands are
 * separate domains serving the same catalogue, and if they shipped the same
 * titles, descriptions and headings, Google would treat them as duplicate
 * content and suppress all but one. Every string that reaches a <title>, a meta
 * description, an <h1>/<h2> or a JSON-LD field must read differently here than
 * on the sibling sites.
 *
 * viglinksi's angle, taken from the design in sites/Viglinksi.html: the auditor
 * who reads the small print — ranked on payout reliability, bonus fairness and
 * complaint history rather than commission.
 */
export const COPY = {
  // Site-wide identity. These feed the root layout's fallback <title>, the
  // default meta description, the Organization/WebSite JSON-LD and the default
  // og:/twitter: description — i.e. every page that does not set its own.
  //
  // `description` must stay distinct from `home.metaDescription`: the home page
  // overrides it, so if the two matched, the site would simply be duplicating
  // itself across the pages that fall back to this one (the legal pages, the
  // 404, and any CMS page with no meta description authored in the admin).
  site: {
    titleTail: 'Audited Casino Reviews & Fair Bonus Terms',
    description:
      'is an independent casino audit desk: we read the terms, test the withdrawals and publish what we find before you sign up.',
    keywords: [
      'independent casino audit',
      'casino payout reliability',
      'bonus wagering terms explained',
      'casino complaint history',
      'casino withdrawal limits',
    ],
  },
  nav: {
    casinos: 'Casinos',
    specialOffers: 'Special Offers',
    categories: 'Categories',
  },
  home: {
    heroEyebrow: 'Audited Casino Reviews',
    // Split in two so the JSX keeps its emphasised <em> while the words change.
    heroHeadline: 'Casino reviews that read',
    heroHighlight: 'the terms before you do',
    heroSubtitle:
      'Ranked by payout reliability, bonus fairness and complaint history — never by commission.',
    topCasinosTitle: 'The Audited List',
    topCasinosSubtitle: 'Every operator below cleared our audit. Narrow the list by category.',
    featuredCasinos: 'See the Audit',
    specialOffers: 'Fair-Wagering Offers',
    viewAll: 'View All',
    // Leads the home <title>; the year and brand are appended in page.tsx.
    homeTitle: 'Audited Casino Reviews',
    faqTitle: 'Questions players actually ask',
    metaDescription:
      'Online casinos audited on payout reliability, bonus fairness and complaint history — never ranked by commission.',
  },
  casinos: {
    pageTitle: 'Audited Casino Reviews',
    pageDescription:
      'Casino reviews that start with the terms and conditions — payout reliability, bonus fairness and complaint history, documented.',
    // Meta-description fallback for a casino review page. Casino records are
    // GLOBAL master data shared by every site, so without a per-site line here
    // all four domains would ship the identical description for the same casino.
    // Short per-site tail appended to an ADMIN-ENTERED casino meta description.
    // Casino records are shared by every site, so without this the same
    // description would ship on all four domains the moment the field is filled.
    reviewSignature: 'Audited before it was listed.',
    reviewSummary: 'audited on payout reliability, bonus fairness and complaint history.',
    visitCasino: 'Open Casino',
    readReview: 'Read the Audit',
    rating: 'Audit Score',
    noResults: 'No casinos match this filter yet.',
  },
  specialOffers: {
    pageTitle: 'Offers With Wagering We Would Accept',
    pageDescription:
      'Bonus offers whose wagering requirements, game weighting and withdrawal caps are stated in full before you claim.',
    // Appended to an offer's (shared) bonus text so the four sites do not ship
    // an identical meta description for the same offer.
    offerMetaSuffix: 'Audited for wagering fairness, with the game weighting stated before you claim.',
    claim: 'Claim Offer',
    noResults: 'No offers clear our wagering bar right now.',
  },
  categories: {
    pageTitle: 'Audited by Category',
    pageDescription:
      'Browse audited casinos by payout speed, game type and the fairness of their bonus terms.',
    // Meta-description tail for a single category page. Category records are
    // shared master data, so this is what keeps the four sites distinct there.
    categoryMetaSuffix: 'audited on payout reliability, bonus fairness and complaint history before listing.',
    noResults: 'Nothing listed under this category yet.',
  },
  newsletter: {
    title: 'Delistings, in your inbox',
    subtitle: 'We email when a casino is removed from the list — and when one earns a place on it.',
    placeholder: 'Enter your email',
    button: 'Subscribe',
    success: 'Almost done — check your inbox and confirm your address to finish subscribing.',
    error: 'That did not go through. Please try again.',
  },
  footer: {
    // Short brand blurb in the footer, above the legal links.
    //
    // KEEP THIS UNDER ~72 CHARACTERS. The footer's brand column is
    // (1152 - 32 padding - 40 gap) / 2 = 540px at the sm: breakpoint where the
    // grid becomes two columns, and the text renders at 14px — about 77
    // characters to a line. Anything longer wraps to a second line, which is
    // what this wording was trimmed to fix. It still wraps on a phone, where a
    // single column is ~340px; that is unavoidable for any real sentence and is
    // the correct behaviour there.
    tagline:
      'An independent audit desk. We test payouts and publish results — 18+.',
    // Registered postal address, shown beside the copyright line. A physical
    // address in the footer is what mailbox providers and the gambling
    // affiliate compliance checks both look for, and it must match the address
    // used in the email templates.
    postalAddress: '10 Albert Square, Manchester M2 5DB, United Kingdom',
    disclaimer:
      'Gambling carries real financial risk and is for adults aged 18 and over only. Treat it as entertainment, never as income, and stop when it stops being fun. Some links here earn us a commission; it plays no part in whether a casino passes the audit.',
  },
  errors: {
    notFound: 'We could not find that page.',
    apiError: 'Could not load this content. Please try again shortly.',
  },
} as const
