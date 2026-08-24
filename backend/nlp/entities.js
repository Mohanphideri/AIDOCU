/**
 * nlp/entities.js — lightweight, fully deterministic entity detection.
 * No ML/NER model — just regexes and a small gazetteer. Good enough to
 * bias retrieval toward sentences that actually contain the kind of
 * evidence a question type demands (dates for WHEN, money for HOW_MUCH…).
 */

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';

const RE = {
  year: /\b(19|20)\d{2}\b/g,
  fullDate: new RegExp(`\\b(?:(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})\\b`, 'gi'),
  money: /(?:₹|\$|€|£|Rs\.?\s?|INR\s?|USD\s?)\s?\d[\d,]*(?:\.\d+)?\s?(?:crore|lakh|million|billion|thousand|k|m|bn)?/gi,
  percent: /\b\d+(?:\.\d+)?\s?%/g,
  number: /\b\d[\d,]*(?:\.\d+)?\b/g,
  properNoun: /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\b/g,
};

const LOCATION_HINTS = new Set([
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'city', 'state', 'country',
  'headquarters', 'hq', 'office', 'building', 'floor', 'suite', 'district',
]);

const ORG_HINTS = new Set([
  'inc', 'inc.', 'llc', 'ltd', 'ltd.', 'corp', 'corp.', 'corporation',
  'company', 'co', 'co.', 'group', 'organization', 'organisation', 'pvt',
]);

const PERSON_TITLE_HINTS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'ceo', 'cfo', 'coo', 'director',
  'manager', 'president', 'founder', 'chairman', 'chairperson',
]);

/** Extract every entity type at once from a sentence. Cheap regex sweep. */
function extractEntities(text) {
  if (!text) return { dates: [], money: [], percents: [], numbers: [], properNouns: [], hasLocationHint: false, hasOrgHint: false, hasPersonHint: false };

  const dates = [...(text.match(RE.fullDate) || []), ...(text.match(RE.year) || [])];
  const money = text.match(RE.money) || [];
  const percents = text.match(RE.percent) || [];
  const numbers = text.match(RE.number) || [];
  const properNouns = text.match(RE.properNoun) || [];

  const lower = text.toLowerCase();
  const tokens = lower.match(/[a-z']+\.?/g) || [];
  const hasLocationHint = tokens.some((t) => LOCATION_HINTS.has(t));
  const hasOrgHint = tokens.some((t) => ORG_HINTS.has(t));
  const hasPersonHint = tokens.some((t) => PERSON_TITLE_HINTS.has(t));

  return { dates, money, percents, numbers, properNouns, hasLocationHint, hasOrgHint, hasPersonHint };
}

module.exports = { extractEntities };
