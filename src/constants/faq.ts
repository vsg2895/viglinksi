/**
 * Frequently asked questions for this site.
 *
 * Rendered VISIBLY on the home page and emitted as FAQPage structured data from
 * this same array. Google requires the two to match; markup-only FAQ is a
 * guidelines violation, which is why the page maps over this constant rather
 * than duplicating the text.
 *
 * The wording is unique to this site: these answers are indexable page content,
 * and they are exactly the kind of text an answer engine quotes.
 */
export const FAQ_ITEMS = [
  {
    question: "How does a casino earn a place on this list?",
    answer:
      "It has to clear an audit: a current licence, withdrawal limits that match its published terms, a bonus whose wagering we would accept ourselves, and no unresolved pattern of payout complaints. Failing any one keeps it off the list.",
  },
  {
    question: "Do you get paid by the casinos you list?",
    answer:
      "We may earn a commission on sign-ups through our links. Ranking is never for sale, and commission plays no part in whether an operator passes the audit or where it appears.",
  },
  {
    question: "What does the rating actually measure?",
    answer:
      "Payout reliability, the fairness of bonus terms and complaint history, weighted in that order. It is a single editorial score, not an average of user votes.",
  },
  {
    question: "How current is the information?",
    answer:
      "Each entry is re-checked when an operator changes its terms, and the revision date is published in the page structured data so you can see how fresh it is.",
  },
  {
    question: "What is the most common trap in a bonus?",
    answer:
      "The maximum cashout. A 200 percent bonus capped at a small withdrawal is worth less than a modest offer with no cap. We state the cap before you claim.",
  },
] as const
