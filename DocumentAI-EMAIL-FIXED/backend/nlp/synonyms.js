/** Controlled synonym/semantic expansion for high-recall document retrieval. */
const { stem } = require('./preprocess');
const { CONCEPT_GROUPS } = require('./semanticConcepts');

const RAW_GROUPS = [
  ...CONCEPT_GROUPS,
  ['cancel','cancels','cancelled','canceled','cancelling','canceling','cancellation','terminate','terminated','termination','end','ended','ending'],
  ['refund','refunds','refunded','reimbursement','repayment','moneyback','return','returned','getback'],
  ['price','prices','priced','cost','costs','fee','fees','charge','charges','pricing','amount','rate'],
  ['employee','employees','employment','employed','staff','worker','workers'],
  ['purchase','purchases','purchased','buy','buys','bought','procurement','acquire','acquired'],
  ['founded','found','establish','established','create','created','start','started','incorporate','incorporated','launch','launched'],
  ['summary','summarize','summarise','overview','highlights','key points','main points'],
  ['explain','explanation','describe','description','details','detail'],
  ['policy','policies','guideline','guidelines','rule','rules'],
  ['benefit','benefits','advantage','advantages','perk','perks'],
  ['requirement','requirements','prerequisite','prerequisites','criteria','criterion'],
  ['approve','approves','approved','approval','authorize','authorized','authorise','authorised'],
  ['location','locations','address','addresses','headquarters','office','offices'],
  ['discount','discounts','reduction','reductions','markdown'],
  ['payment','payments','pay','paid','paying'],
  ['duration','period','periods','term','terms','length'],
  ['penalty','penalties','fine','fines','charge','charges'],
  ['increase','increases','increased','growth','rise','rose','grew','grow'],
  ['decrease','decreases','decreased','decline','declined','drop','dropped','fell','fall'],
];

const SYNONYM_MAP = new Map();
for (const group of RAW_GROUPS) {
  const stemmed = [...new Set(group.flatMap((term) => String(term).split(/\s+/).map(stem)))];
  for (const term of stemmed) {
    const existing = SYNONYM_MAP.get(term) || new Set();
    for (const other of stemmed) if (other !== term) existing.add(other);
    SYNONYM_MAP.set(term, existing);
  }
}

function relatedStems(stemmedTerm) {
  return SYNONYM_MAP.get(stemmedTerm) || new Set();
}

module.exports = { SYNONYM_MAP, relatedStems };
