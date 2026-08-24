/**
 * nlp/synonyms.js — controlled synonym dictionary used for query expansion.
 *
 * Deliberately hand-curated (not an uncontrolled thesaurus lookup) so
 * expansion improves recall without dragging in unrelated terms that
 * would hurt precision. Each entry maps a stemmed lemma -> related
 * stemmed lemmas. Bidirectional: if A expands to B, B also expands to A.
 */
const { stem } = require('./preprocess');

// Note: the project's stemmer (nlp/preprocess.js) is a deliberately
// lightweight suffix-stripper, not a real morphological analyzer, so
// e.g. "terminated" and "termination" do NOT reduce to the same stem.
// To keep expansion effective, groups spell out the inflected forms
// that actually occur in documents rather than relying on the stemmer
// to unify them.
const RAW_GROUPS = [
  ['cancel', 'cancels', 'cancelled', 'canceled', 'cancelling', 'canceling', 'cancellation', 'cancellations',
   'terminate', 'terminates', 'terminated', 'terminating', 'termination', 'terminations',
   'end', 'ends', 'ended', 'ending'],
  ['contract', 'contracts', 'agreement', 'agreements', 'terms', 'arrangement', 'arrangements'],
  ['employee', 'employees', 'employment', 'employed', 'staff', 'worker', 'workers'],
  ['purchase', 'purchases', 'purchased', 'buy', 'buys', 'bought', 'procurement', 'acquire', 'acquired'],
  ['price', 'prices', 'priced', 'cost', 'costs', 'fee', 'fees', 'charge', 'charges', 'pricing', 'amount'],
  ['revenue', 'income', 'earnings', 'sales'],
  ['warranty', 'warranties', 'guarantee', 'guarantees', 'coverage'],
  ['delivery', 'deliveries', 'shipping', 'shipment', 'shipments', 'dispatch'],
  ['founded', 'found', 'establish', 'established', 'create', 'created', 'start', 'started',
   'incorporate', 'incorporated', 'launch', 'launched'],
  ['refund', 'refunds', 'refunded', 'reimbursement', 'reimbursements', 'repayment'],
  ['policy', 'policies', 'guideline', 'guidelines', 'rule', 'rules'],
  ['benefit', 'benefits', 'advantage', 'advantages', 'perk', 'perks'],
  ['requirement', 'requirements', 'prerequisite', 'prerequisites', 'criteria', 'criterion'],
  ['approve', 'approves', 'approved', 'approval', 'authorize', 'authorized', 'authorise', 'authorised'],
  ['location', 'locations', 'address', 'addresses', 'headquarters', 'office', 'offices'],
  ['discount', 'discounts', 'reduction', 'reductions', 'markdown'],
  ['payment', 'payments', 'pay', 'paid', 'paying'],
  ['duration', 'period', 'periods', 'term', 'terms', 'length'],
  ['penalty', 'penalties', 'fine', 'fines', 'charge', 'charges'],
  ['increase', 'increases', 'increased', 'growth', 'rise', 'rose', 'grew', 'grow'],
  ['decrease', 'decreases', 'decreased', 'decline', 'declined', 'drop', 'dropped', 'fell', 'fall'],
];

// Build a stemmed adjacency map so lookups line up with the stemmer
// already used by BM25/TF-IDF.
const SYNONYM_MAP = new Map();
for (const group of RAW_GROUPS) {
  const stemmed = [...new Set(group.map(stem))];
  for (const term of stemmed) {
    const existing = SYNONYM_MAP.get(term) || new Set();
    for (const other of stemmed) {
      if (other !== term) existing.add(other);
    }
    SYNONYM_MAP.set(term, existing);
  }
}

/** Returns the set of related stemmed terms for a given stemmed term (may be empty). */
function relatedStems(stemmedTerm) {
  return SYNONYM_MAP.get(stemmedTerm) || new Set();
}

module.exports = { SYNONYM_MAP, relatedStems };
