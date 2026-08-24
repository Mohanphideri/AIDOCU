/**
 * semanticConcepts.js
 *
 * Controlled semantic phrase/concept map for DocumentAI.  This is not a
 * generative model; it is a deterministic domain-language layer that makes
 * BM25/TF-IDF understand common ways users ask the same thing.
 */
const CONCEPT_GROUPS = [
  ['refund','refunds','refunded','reimbursement','reimburse','repayment','money back','moneyback','get money back','return my money'],
  ['cancel','cancelled','canceled','cancellation','terminate','termination','end subscription','end contract','close account','stop service','discontinue'],
  ['start','started','starting','begin','began','launch','launched','initiate','commence','activate','activation'],
  ['price','pricing','cost','costs','fee','fees','charge','charges','amount','rate','rates','how much','price of'],
  ['payment','pay','paid','paying','billing','bill','invoice','transaction','settlement'],
  ['deadline','due date','due','deadline','time limit','cutoff','closing date','expires','expiration'],
  ['duration','how long','length','period','term','time period','timeframe','timeline','days','weeks','months'],
  ['requirement','requirements','needed','need','prerequisite','criteria','eligibility','eligible','qualify','qualification'],
  ['benefit','benefits','advantage','advantages','feature','features','perks','included','includes'],
  ['problem','issue','error','failure','failed','trouble','troubleshooting','not working','cannot','unable'],
  ['support','help','assistance','contact','customer service','help desk','support team','representative'],
  ['contact','email','phone','telephone','call','address','reach','contact us'],
  ['location','located','where','address','office','headquarters','branch','site','place'],
  ['owner','owns','owned by','responsible','responsibility','manager','manages','supervisor','administrator'],
  ['author','written by','created by','prepared by','publisher','published by'],
  ['purpose','objective','goal','aim','intended to','designed to','why does this exist','what is the purpose'],
  ['definition','meaning','means','refers to','defined as','what does it mean','what is meant by'],
  ['process','procedure','workflow','steps','how to','instructions','method','approach'],
  ['reason','why','because','cause','caused by','justification','rationale'],
  ['comparison','compare','difference','different','versus','vs','better','similarity','same as'],
  ['example','examples','sample','instance','case','illustration'],
  ['summary','summarize','summarise','overview','highlights','key points','main points','brief','in short','tl;dr'],
  ['list','items','types','categories','options','choices','kinds','what are the'],
  ['date','dates','when','year','day','month','effective date','as of'],
  ['quantity','how many','number','count','total','amount','volume','quantity'],
  ['policy','policies','rule','rules','guideline','guidelines','regulation','regulations','terms'],
  ['security','secure','privacy','data protection','authentication','authorization','access control'],
  ['login','sign in','signin','log in','account access','password','credentials'],
  ['register','registration','sign up','signup','create account','account creation','join'],
  ['password reset','forgot password','reset password','recover account','forgot my password'],
  ['document','file','report','paper','pdf','record','material'],
  ['section','chapter','part','heading','topic','subject'],
  ['total','sum','overall','combined','altogether','in total'],
  ['increase','increased','increase in','growth','rise','higher','grew','up'],
  ['decrease','decreased','decrease in','decline','drop','lower','fell','down'],
  ['approval','approve','approved','authorization','authorize','permission','consent'],
  ['delivery','deliver','shipping','shipment','dispatch','sent','arrival','arrive'],
  ['warranty','guarantee','coverage','covered','protection'],
  ['employment','employee','employees','staff','worker','workers','job','workforce'],
  ['contract','agreement','arrangement','deal','terms and conditions'],
  ['purchase','buy','bought','acquire','acquisition','procurement','order'],
  ['return','returns','exchange','replacement','send back','give back'],
  ['discount','reduction','markdown','offer','promotion','sale','saving'],
  ['risk','danger','threat','hazard','exposure'],
  ['responsibility','duty','obligation','must','required to','accountable'],
  ['permission','allowed','permitted','can','may','authorization'],
  ['prohibited','not allowed','forbidden','cannot','must not','restricted'],
  ['performance','speed','efficiency','capacity','throughput','response time'],
  ['availability','available','unavailable','access','open','closed'],
  ['history','previous','past','earlier','record','background'],
  ['result','outcome','conclusion','finding','findings','effect','impact'],
  ['cause','reason','source','origin','root cause'],
  ['effect','impact','result','consequence','outcome'],
  ['contact information','email address','phone number','telephone number','mailing address'],
];

function normalizePhrase(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildConceptMap() {
  const map = new Map();
  for (const group of CONCEPT_GROUPS) {
    const normalized = [...new Set(group.map(normalizePhrase).filter(Boolean))];
    for (const term of normalized) {
      const set = map.get(term) || new Set();
      for (const other of normalized) if (other !== term) set.add(other);
      map.set(term, set);
    }
  }
  return map;
}

const CONCEPT_MAP = buildConceptMap();

function expandConceptPhrases(text) {
  const input = normalizePhrase(text);
  const additions = new Set();
  for (const [term, related] of CONCEPT_MAP) {
    if (input.includes(term)) for (const r of related) additions.add(r);
  }
  return [...additions];
}

module.exports = { CONCEPT_GROUPS, CONCEPT_MAP, expandConceptPhrases, normalizePhrase };
