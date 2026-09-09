/**
 * All exam timing math lives here so it's calculated exactly one way,
 * server-side. The client's countdown is cosmetic; it must resync against
 * `getRemainingMs` on load, on reconnect, and periodically.
 */

function computeEndTime(startedAt, durationMinutes) {
  return new Date(new Date(startedAt).getTime() + durationMinutes * 60 * 1000);
}

function getRemainingMs(examEndTime, now = new Date()) {
  const remaining = new Date(examEndTime).getTime() - now.getTime();
  return Math.max(0, remaining);
}

function isExpired(examEndTime, now = new Date()) {
  return getRemainingMs(examEndTime, now) <= 0;
}

module.exports = { computeEndTime, getRemainingMs, isExpired };
